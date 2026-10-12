import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  ArrowLeft, 
  Layout, 
  FileText, 
  Square, 
  Circle, 
  Triangle, 
  Hexagon, 
  Type,
  Plus,
  Trash2,
  X,
  Save,
  CheckSquare,
  CheckCircle,
  Circle as CircleIcon,
  Upload,
  GripVertical,
  Undo2,
  Redo2
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { getNotes, saveNotes, getCanvas, saveCanvas, getTodos, saveTodos } from '../data/storage';

const LayoutTree = ({ nodes, connections }) => {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center text-slate-500 mt-10">
        <Layout size={40} className="mx-auto mb-4 opacity-50" />
        <p>No nodes to display.</p>
      </div>
    );
  }

  const incomingEdges = new Set(connections.map(c => c.to));
  const rootNodes = nodes.filter(n => !incomingEdges.has(n.id));
  let startNodes = rootNodes.length > 0 ? rootNodes : [nodes[0]];
  const allVisited = new Set();
  
  const renderTree = (node, visitedPath = new Set()) => {
    if (!node) return null;
    
    const isVisited = visitedPath.has(node.id);
    const newVisitedPath = new Set(visitedPath).add(node.id);
    allVisited.add(node.id);
    
    const childConnections = connections.filter(c => c.from === node.id);
    const childNodes = childConnections.map(c => nodes.find(n => n.id === c.to)).filter(Boolean);

    return (
      <div key={`${node.id}-${visitedPath.size}`} className="relative w-max min-w-full">
        <div className="flex items-start py-1">
          <div className="text-sm font-mono whitespace-nowrap pr-2">
            {node.text ? (
              <span className="text-green-400">"{node.text}"</span>
            ) : (
              <span className="text-slate-400 italic">"{node.type}"</span>
            )}
            
            {isVisited ? (
              <span className="text-amber-500/70 text-xs ml-2 italic">[Circular]</span>
            ) : childNodes.length > 0 ? (
              <span className="text-slate-300 ml-1">:</span>
            ) : null}
          </div>
        </div>
        
        {!isVisited && childNodes.length > 0 && (
          <div className="ml-2 pl-4 border-l border-slate-600 relative">
            {childNodes.map((child, idx) => renderTree(child, newVisitedPath, idx === childNodes.length - 1))}
          </div>
        )}
      </div>
    );
  };

  const trees = [];
  startNodes.forEach((node, idx) => {
    trees.push(renderTree(node, new Set(), idx === startNodes.length - 1));
  });

  nodes.forEach(node => {
    if (!allVisited.has(node.id)) {
      trees.push(renderTree(node, new Set(), true));
    }
  });

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 overflow-auto">
      <div className="text-slate-300 mb-2 font-mono text-sm w-max min-w-full">{"{"}</div>
      <div className="ml-2 pl-4 border-l border-slate-600 w-max min-w-full">
        {trees}
      </div>
      <div className="text-slate-300 mt-2 font-mono text-sm w-max min-w-full">{"}"}</div>
    </div>
  );
};

const ProjectWorkspace = ({ project, onBack }) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState('notes'); 
  
  // Notes state
  const [notes, setNotes] = useState([]);
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  
  useEffect(() => {
    getNotes(project.id).then(data => {
      setNotes(data);
      setIsNotesLoaded(true);
    });
  }, [project.id]);

  const notesRef = useRef(notes);
  useEffect(() => {
    notesRef.current = notes;
  }, [notes]);

  useEffect(() => { 
    if (isNotesLoaded) {
      const timer = setTimeout(() => {
        saveNotes(project.id, notes); 
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [notes, project.id, isNotesLoaded]);
  
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [noteTitleInput, setNoteTitleInput] = useState('');
  
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isNoteModalClosing, setIsNoteModalClosing] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleteModalClosing, setIsDeleteModalClosing] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);

  const closeNoteModal = () => {
    setIsNoteModalClosing(true);
    setTimeout(() => {
      setIsNoteModalOpen(false);
      setIsNoteModalClosing(false);
    }, 200);
  };

  const closeDeleteModal = () => {
    setIsDeleteModalClosing(true);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      setNoteToDelete(null);
    }, 200);
  };

  const handleCreateNote = () => {
    const newNote = { id: Date.now(), title: 'New Note', content: '', date: new Date().toLocaleDateString() };
    setNotes([newNote, ...notes]);
    setEditingNoteId(newNote.id);
    setNoteTitleInput(newNote.title);
    setNoteInput(newNote.content);
    setActiveSidebarTab('notes');
    setIsNoteModalOpen(true);
  };

  const handleSaveNote = () => {
    setNotes(notes.map(n => n.id === editingNoteId ? { ...n, title: noteTitleInput, content: noteInput } : n));
    setEditingNoteId(null);
    closeNoteModal();
  };

  const handleDeleteNoteConfirm = (id) => {
    setNotes(notes.filter(n => n.id !== id));
    if (editingNoteId === id) setEditingNoteId(null);
    closeDeleteModal();
  };

  const openDeleteModal = (id, e) => {
    e.stopPropagation();
    setNoteToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitleInput(note.title);
    setNoteInput(note.content);
    setIsNoteModalOpen(true);
  };

  const handleCancelEdit = () => {
    const note = notes.find(n => n.id === editingNoteId);
    if (note && !note.content && (!note.title || !note.title.trim() || note.title === 'New Note')) {
      setNotes(notes.filter(n => n.id !== editingNoteId));
    }
    setEditingNoteId(null);
    closeNoteModal();
  };

  // Todo State
  const [todos, setTodos] = useState([]);
  const [isTodosLoaded, setIsTodosLoaded] = useState(false);
  
  useEffect(() => {
    getTodos(project.id).then(data => {
      setTodos(data);
      setIsTodosLoaded(true);
    });
  }, [project.id]);

  const todosRef = useRef(todos);
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  useEffect(() => { 
    if (isTodosLoaded) {
      const timer = setTimeout(() => {
        saveTodos(project.id, todos); 
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [todos, project.id, isTodosLoaded]);

  useEffect(() => {
    return () => {
      if (isNotesLoaded) saveNotes(project.id, notesRef.current);
      if (isTodosLoaded) saveTodos(project.id, todosRef.current);
    };
  }, [project.id, isNotesLoaded, isTodosLoaded]);

  const [editingTodoId, setEditingTodoId] = useState(null);
  const [todoInput, setTodoInput] = useState('');
  
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTodoModalClosing, setIsTodoModalClosing] = useState(false);
  const [isDeleteTodoModalOpen, setIsDeleteTodoModalOpen] = useState(false);
  const [isDeleteTodoModalClosing, setIsDeleteTodoModalClosing] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  
  const closeTodoModal = () => {
    setIsTodoModalClosing(true);
    setTimeout(() => {
      setIsTodoModalOpen(false);
      setIsTodoModalClosing(false);
    }, 200);
  };

  const closeDeleteTodoModal = () => {
    setIsDeleteTodoModalClosing(true);
    setTimeout(() => {
      setIsDeleteTodoModalOpen(false);
      setIsDeleteTodoModalClosing(false);
      setTodoToDelete(null);
    }, 200);
  };

  const handleCreateTodo = () => {
    const newTodo = { id: Date.now(), text: '', completed: false, date: new Date().toLocaleDateString() };
    setTodos([newTodo, ...todos]);
    setEditingTodoId(newTodo.id);
    setTodoInput('');
    setActiveSidebarTab('todos');
    setIsTodoModalOpen(true);
  };

  const handleSaveTodo = () => {
    if (!todoInput.trim()) {
      handleCancelEditTodo();
      return;
    }
    setTodos(todos.map(t => t.id === editingTodoId ? { ...t, text: todoInput } : t));
    setEditingTodoId(null);
    closeTodoModal();
  };

  const handleCancelEditTodo = () => {
    const todo = todos.find(t => t.id === editingTodoId);
    if (todo && !todo.text) {
      setTodos(todos.filter(t => t.id !== editingTodoId));
    }
    setEditingTodoId(null);
    closeTodoModal();
  };

  const handleEditTodo = (todo, e) => {
    if (e) e.stopPropagation();
    setEditingTodoId(todo.id);
    setTodoInput(todo.text);
    setIsTodoModalOpen(true);
  };

  const toggleTodoCompletion = (id, e) => {
    if (e) e.stopPropagation();
    setTodos(todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };
  
  const handleDeleteTodoConfirm = (id) => {
    setTodos(todos.filter(t => t.id !== id));
    if (editingTodoId === id) {
      setEditingTodoId(null);
      closeTodoModal();
    }
    closeDeleteTodoModal();
  };

  const openDeleteTodoModal = (id, e) => {
    if (e) e.stopPropagation();
    setTodoToDelete(id);
    setIsDeleteTodoModalOpen(true);
  };

  // Canvas State
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [isCanvasLoaded, setIsCanvasLoaded] = useState(false);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  
  // History State for Canvas (Undo / Redo)
  const [history, setHistory] = useState({ past: [], future: [] });

  const nodesRef = useRef(nodes);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  const connectionsRef = useRef(connections);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const selectedNodeIdsRef = useRef(selectedNodeIds);
  useEffect(() => {
    selectedNodeIdsRef.current = selectedNodeIds;
  }, [selectedNodeIds]);

  const dragInitialStateRef = useRef(null);
  const textBeforeEditRef = useRef(null);

  useEffect(() => {
    getCanvas(project.id).then(initialCanvas => {
      setNodes(initialCanvas.nodes || []);
      setConnections(initialCanvas.connections || []);
      setIsCanvasLoaded(true);
      setHistory({ past: [], future: [] });
    });
  }, [project.id]);

  useEffect(() => {
    if (isCanvasLoaded) {
      saveCanvas(project.id, { nodes, connections });
    }
  }, [nodes, connections, project.id, isCanvasLoaded]);

  const pushHistory = (pastNodes = nodesRef.current, pastConnections = connectionsRef.current) => {
    const nodesClone = pastNodes.map(n => ({ ...n }));
    const connsClone = pastConnections.map(c => ({ ...c }));
    setHistory(curr => ({
      past: [...curr.past.slice(-30), { nodes: nodesClone, connections: connsClone }],
      future: []
    }));
  };

  const handleUndo = useCallback(() => {
    setHistory(curr => {
      if (curr.past.length === 0) return curr;
      const previous = curr.past[curr.past.length - 1];
      const newPast = curr.past.slice(0, curr.past.length - 1);
      const currentSnapshot = {
        nodes: nodesRef.current.map(n => ({ ...n })),
        connections: connectionsRef.current.map(c => ({ ...c }))
      };
      const newFuture = [currentSnapshot, ...curr.future];
      
      setNodes(previous.nodes.map(n => ({ ...n })));
      setConnections(previous.connections.map(c => ({ ...c })));
      setSelectedNodeIds([]);
      
      return {
        past: newPast,
        future: newFuture
      };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistory(curr => {
      if (curr.future.length === 0) return curr;
      const next = curr.future[0];
      const newFuture = curr.future.slice(1);
      const currentSnapshot = {
        nodes: nodesRef.current.map(n => ({ ...n })),
        connections: connectionsRef.current.map(c => ({ ...c }))
      };
      const newPast = [...curr.past, currentSnapshot];
      
      setNodes(next.nodes.map(n => ({ ...n })));
      setConnections(next.connections.map(c => ({ ...c })));
      setSelectedNodeIds([]);
      
      return {
        past: newPast,
        future: newFuture
      };
    });
  }, []);

  const canvasRef = useRef(null);
  const [draggingNode, setDraggingNode] = useState(null); 
  const [drawingConnection, setDrawingConnection] = useState(null); 
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const [selectionBox, setSelectionBox] = useState(null);
  const [resizingNode, setResizingNode] = useState(null);

  const deleteSelectedNodes = useCallback(() => {
    const ids = selectedNodeIdsRef.current;
    if (!ids || ids.length === 0) return;
    pushHistory();
    const idsToDelete = new Set(ids);
    setNodes(prev => prev.filter(n => !idsToDelete.has(n.id)));
    setConnections(prev => prev.filter(c => !idsToDelete.has(c.from) && !idsToDelete.has(c.to)));
    setSelectedNodeIds([]);
  }, []);

  const generateFlowFromFileTree = (content) => {
    const lines = content.split('\n');
    const newNodes = [];
    const newConnections = [];
    const parentStack = [];

    let currentY = nodes.length > 0 ? Math.max(...nodes.map(n => n.y + (n.height || 96))) + 100 : 0;
    const startX = 0;
    const verticalSpacing = 120;
    const horizontalSpacing = 200;

    lines.forEach((line) => {
      line = line.replace(/\r$/, '');
      if (!line.trim() || line.startsWith('```')) return;

      const prefixMatch = line.match(/^[\s│├└─]*/);
      const prefix = prefixMatch ? prefixMatch[0] : '';
      const name = line.slice(prefix.length).trim();
      if (!name) return;

      const depth = Math.round(prefix.length / 4);
      const nodeId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      
      while (parentStack.length > 0 && parentStack[parentStack.length - 1].depth >= depth) {
        parentStack.pop();
      }
      const parent = parentStack.length > 0 ? parentStack[parentStack.length - 1] : null;

      const nodeX = parent ? parent.x + horizontalSpacing : startX;
      const nodeY = currentY;

      const newNode = {
        id: nodeId,
        type: 'Square',
        x: nodeX,
        y: nodeY,
        text: name,
        width: 140,
        height: 60
      };
      
      newNodes.push(newNode);
      currentY += verticalSpacing;

      if (parent) {
        newConnections.push({
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          from: parent.id,
          fromHandle: 'right',
          to: nodeId,
          toHandle: 'left'
        });
      }

      parentStack.push({ depth, id: nodeId, x: nodeX, y: nodeY });
    });

    if (newNodes.length > 0) {
      pushHistory();
      setNodes(prev => [...prev, ...newNodes]);
      setConnections(prev => [...prev, ...newConnections]);
      setActiveSidebarTab('layouts');
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      generateFlowFromFileTree(content);
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  // Zoom and Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const isAnyModalOpen = isNoteModalOpen || isDeleteModalOpen || isTodoModalOpen || isDeleteTodoModalOpen;
  const isAnyModalOpenRef = useRef(isAnyModalOpen);
  useEffect(() => {
    isAnyModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  const handleUndoRef = useRef(handleUndo);
  useEffect(() => {
    handleUndoRef.current = handleUndo;
  }, [handleUndo]);

  const handleRedoRef = useRef(handleRedo);
  useEffect(() => {
    handleRedoRef.current = handleRedo;
  }, [handleRedo]);

  const deleteSelectedNodesRef = useRef(deleteSelectedNodes);
  useEffect(() => {
    deleteSelectedNodesRef.current = deleteSelectedNodes;
  }, [deleteSelectedNodes]);

  // Keyboard events for Spacebar panning, Delete/Backspace, and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
        e.preventDefault(); // Prevent page scroll
        return;
      }

      if (isAnyModalOpenRef.current) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

      // Delete or Backspace key to delete selected shapes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIdsRef.current.length > 0) {
          e.preventDefault();
          deleteSelectedNodesRef.current();
        }
        return;
      }

      // Undo: Ctrl+Z or Cmd+Z
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        handleUndoRef.current();
        return;
      }

      // Redo: Ctrl+Y, Cmd+Y, Ctrl+Shift+Z, or Cmd+Shift+Z
      const isRedo = ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
                     ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && e.shiftKey);
      if (isRedo) {
        e.preventDefault();
        handleRedoRef.current();
        return;
      }
    };
    const handleKeyUp = (e) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
        setIsPanning(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Wheel events for Zooming
  useEffect(() => {
    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const handleWheel = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault(); // Prevent browser zoom
        setZoom((prevZoom) => {
          const zoomFactor = Math.exp(-e.deltaY * 0.0005);
          const newZoom = prevZoom * zoomFactor;
          return Math.min(Math.max(0.1, newZoom), 3); // clamp between 10% and 300%
        });
      }
    };
    // Need passive: false to allow e.preventDefault()
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag and Drop from navbar
  const onDragStartNavbar = (e, shapeType) => {
    e.dataTransfer.setData('shapeType', shapeType);
  };

  const onDragOverCanvas = (e) => {
    e.preventDefault();
  };

  const onDropCanvas = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('shapeType');
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;

    const newNode = {
      id: Date.now().toString(),
      type,
      x: localX - 48,
      y: localY - 48,
      text: '',
      width: 96,
      height: 96
    };
    pushHistory();
    setNodes([...nodes, newNode]);
  };

  // Node Resizing
  const startResizeNode = (e, node) => {
    if (isSpacePressed) return;
    e.stopPropagation();
    if (drawingConnection) return;
    
    dragInitialStateRef.current = {
      nodes: nodesRef.current.map(n => ({ ...n })),
      connections: connectionsRef.current.map(c => ({ ...c }))
    };

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;
    
    setResizingNode({
      id: node.id,
      startX: localX,
      startY: localY,
      startWidth: node.width || 96,
      startHeight: node.height || 96
    });
  };

  // Node Dragging
  const startDragNode = (e, node) => {
    if (isSpacePressed) return;
    e.stopPropagation();
    if (drawingConnection || resizingNode) return;

    dragInitialStateRef.current = {
      nodes: nodesRef.current.map(n => ({ ...n })),
      connections: connectionsRef.current.map(c => ({ ...c }))
    };

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;
    
    if (e.shiftKey) {
      const isSelected = selectedNodeIds.includes(node.id);
      const nextSelected = isSelected 
        ? selectedNodeIds.filter(id => id !== node.id)
        : [...selectedNodeIds, node.id];
      setSelectedNodeIds(nextSelected);
      if (isSelected) return;
      setDraggingNode({
        isGroup: true,
        startX: localX,
        startY: localY,
        initialNodes: nodes.filter(n => nextSelected.includes(n.id))
      });
      return;
    }

    if (selectedNodeIds.includes(node.id)) {
      setDraggingNode({
        isGroup: true,
        startX: localX,
        startY: localY,
        initialNodes: nodes.filter(n => selectedNodeIds.includes(n.id))
      });
    } else {
      setSelectedNodeIds([node.id]);
      setDraggingNode({
        isGroup: false,
        id: node.id,
        offsetX: localX - node.x,
        offsetY: localY - node.y
      });
    }
  };

  // Connection Drawing
  const startConnection = (e, node, handlePos) => {
    if (isSpacePressed) return;
    e.stopPropagation();
    
    const w = node.width || 96;
    const h = node.height || 96;
    let startX = node.x + w / 2;
    let startY = node.y + h / 2;
    if (handlePos === 'right') startX += w / 2;
    if (handlePos === 'left') startX -= w / 2;
    if (handlePos === 'bottom') startY += h / 2;
    if (handlePos === 'top') startY -= h / 2;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;
    
    setDrawingConnection({
      fromId: node.id,
      fromHandle: handlePos,
      startX,
      startY,
      currentX: localX,
      currentY: localY
    });
  };

  const handleCanvasMouseDown = (e) => {
    if (isSpacePressed) {
      setIsPanning(true);
      e.preventDefault();
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - pan.x) / zoom;
      const localY = (e.clientY - rect.top - pan.y) / zoom;
      setSelectionBox({ startX: localX, startY: localY, endX: localX, endY: localY });
      setSelectedNodeIds([]);
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan(prev => ({ x: prev.x + e.movementX, y: prev.y + e.movementY }));
      return;
    }

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;

    if (selectionBox) {
      setSelectionBox({ ...selectionBox, endX: localX, endY: localY });
      const minX = Math.min(selectionBox.startX, localX);
      const maxX = Math.max(selectionBox.startX, localX);
      const minY = Math.min(selectionBox.startY, localY);
      const maxY = Math.max(selectionBox.startY, localY);
      
      const newlySelected = nodes.filter(node => {
        const w = node.width || 96;
        const h = node.height || 96;
        const nodeCenterX = node.x + w / 2;
        const nodeCenterY = node.y + h / 2;
        return nodeCenterX >= minX && nodeCenterX <= maxX && nodeCenterY >= minY && nodeCenterY <= maxY;
      }).map(n => n.id);
      
      setSelectedNodeIds(newlySelected);
      return;
    }

    if (draggingNode) {
      if (draggingNode.isGroup) {
        const deltaX = localX - draggingNode.startX;
        const deltaY = localY - draggingNode.startY;
        setNodes(nodes.map(n => {
          if (selectedNodeIds.includes(n.id)) {
            const initial = draggingNode.initialNodes.find(inNode => inNode.id === n.id);
            return { ...n, x: initial.x + deltaX, y: initial.y + deltaY };
          }
          return n;
        }));
      } else {
        const x = localX - draggingNode.offsetX;
        const y = localY - draggingNode.offsetY;
        setNodes(nodes.map(n => n.id === draggingNode.id ? { ...n, x, y } : n));
      }
    } else if (resizingNode) {
      const deltaX = localX - resizingNode.startX;
      const deltaY = localY - resizingNode.startY;
      const newWidth = Math.max(48, resizingNode.startWidth + deltaX);
      const newHeight = Math.max(48, resizingNode.startHeight + deltaY);
      setNodes(nodes.map(n => n.id === resizingNode.id ? { ...n, width: newWidth, height: newHeight } : n));
    } else if (drawingConnection) {
      setDrawingConnection({
        ...drawingConnection,
        currentX: localX,
        currentY: localY
      });
    }
  };

  const handleCanvasMouseUp = () => {
    if (isPanning) setIsPanning(false);
    if (draggingNode) {
      if (dragInitialStateRef.current) {
        const hasMoved = nodesRef.current.some(n => {
          const init = dragInitialStateRef.current.nodes.find(i => i.id === n.id);
          return init && (init.x !== n.x || init.y !== n.y);
        });
        if (hasMoved) {
          pushHistory(dragInitialStateRef.current.nodes, dragInitialStateRef.current.connections);
        }
        dragInitialStateRef.current = null;
      }
      setDraggingNode(null);
    }
    if (drawingConnection) setDrawingConnection(null);
    if (selectionBox) setSelectionBox(null);
    if (resizingNode) {
      if (dragInitialStateRef.current) {
        const hasResized = nodesRef.current.some(n => {
          const init = dragInitialStateRef.current.nodes.find(i => i.id === n.id);
          return init && (init.width !== n.width || init.height !== n.height);
        });
        if (hasResized) {
          pushHistory(dragInitialStateRef.current.nodes, dragInitialStateRef.current.connections);
        }
        dragInitialStateRef.current = null;
      }
      setResizingNode(null);
    }
  };

  const handleNodeMouseUp = (e, targetNode) => {
    if (drawingConnection && drawingConnection.fromId !== targetNode.id) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2; // center is 0,0
      const y = e.clientY - rect.top - rect.height / 2;
      
      let toHandle;
      if (Math.abs(x) / rect.width > Math.abs(y) / rect.height) {
        toHandle = x > 0 ? 'right' : 'left';
      } else {
        toHandle = y > 0 ? 'bottom' : 'top';
      }

      pushHistory();
      setConnections([
        ...connections, 
        { 
          // eslint-disable-next-line react-hooks/purity
          id: Date.now().toString(), 
          from: drawingConnection.fromId, 
          fromHandle: drawingConnection.fromHandle,
          to: targetNode.id,
          toHandle
        }
      ]);
      setDrawingConnection(null);
    }
  };

  const updateNodeText = (id, text) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNode = (e, id) => {
    if (e) e.stopPropagation();
    pushHistory();
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
    setSelectedNodeIds(prev => prev.filter(selectedId => selectedId !== id));
  };

  const deleteConnection = (id) => {
    pushHistory();
    setConnections(connections.filter(c => c.id !== id));
  };

  const handleNodeHoverMove = (e, node) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2; // center is 0,0
    const y = e.clientY - rect.top - rect.height / 2;
    
    let edge;
    if (Math.abs(x) / rect.width > Math.abs(y) / rect.height) {
      edge = x > 0 ? 'right' : 'left';
    } else {
      edge = y > 0 ? 'bottom' : 'top';
    }
    
    if (!hoveredEdge || hoveredEdge.id !== node.id || hoveredEdge.edge !== edge) {
      setHoveredEdge({ id: node.id, edge });
    }
  };

  // Shapes rendering config
  const getShapeStyles = (type) => {
    switch (type) {
      case 'Circle': return { borderRadius: '50%' };
      case 'Triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
      case 'Hexagon': return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
      case 'Text': return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' };
      case 'Square': default: return { borderRadius: '8px' };
    }
  };

  const selectedNodes = nodes.filter(n => selectedNodeIds.includes(n.id));
  let selectionBounds = null;
  if (selectedNodes.length > 1) {
    const minX = Math.min(...selectedNodes.map(n => n.x));
    const minY = Math.min(...selectedNodes.map(n => n.y));
    const maxX = Math.max(...selectedNodes.map(n => n.x + (n.width || 96)));
    const maxY = Math.max(...selectedNodes.map(n => n.y + (n.height || 96)));
    selectionBounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      count: selectedNodes.length
    };
  }

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans w-full overflow-hidden text-left relative">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 z-20">
        <button onClick={onBack} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl mb-6 transition-colors" title="Back to Projects">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col gap-2 w-full px-2">
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'layouts' ? null : 'layouts')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'layouts' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Layouts">
            <Layout size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'notes' ? null : 'notes')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'notes' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Notes">
            <FileText size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'todos' ? null : 'todos')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'todos' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="To-Do List">
            <CheckSquare size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'import' ? null : 'import')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'import' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Import File Tree">
            <Upload size={20} />
          </button>
        </div>
      </div>

      {/* Expandable Sidebar Content */}
      <div 
        className={`bg-slate-800 flex flex-col z-10 shadow-xl transition-all duration-300 ease-in-out overflow-hidden ${
          activeSidebarTab ? 'w-80 border-r border-slate-700 opacity-100' : 'w-0 border-r-0 border-transparent opacity-0'
        }`}
      >
        <div className="w-80 h-full flex flex-col">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-white capitalize">{activeSidebarTab || ''}</h2>
            {activeSidebarTab === 'notes' && (
              <button onClick={handleCreateNote} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" title="Create Note">
                <Plus size={18} />
              </button>
            )}
            {activeSidebarTab === 'todos' && (
              <button onClick={handleCreateTodo} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" title="Create Task">
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeSidebarTab === 'layouts' && (
              <LayoutTree nodes={nodes} connections={connections} />
            )}
            {activeSidebarTab === 'notes' && (
              <div>
                {notes.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <p>No notes yet.</p>
                    <button onClick={handleCreateNote} className="text-blue-400 hover:text-blue-300 text-sm mt-2 font-medium">Create your first note</button>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={notes} 
                    onReorder={setNotes} 
                    className="space-y-4 list-none p-0 m-0"
                  >
                    {notes.map(note => (
                      <Reorder.Item 
                        key={note.id} 
                        value={note}
                        whileDrag={{ 
                          scale: 1.02, 
                          zIndex: 50, 
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)" 
                        }}
                        className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors select-none list-none relative group/note"
                        onClick={() => handleEditNote(note)}
                      >
                        <div className="p-4 flex gap-2.5 items-start">
                          <div 
                            className="text-slate-500 group-hover/note:text-slate-300 p-0.5 -ml-1 mt-0.5 rounded transition-colors flex-shrink-0"
                            title="Drag to reorder"
                          >
                            <GripVertical size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-medium text-white truncate pr-2">{note.title}</h3>
                              <div className="flex gap-1 opacity-0 group-hover/note:opacity-100 transition-opacity">
                                <button 
                                  type="button"
                                  onPointerDown={(e) => e.stopPropagation()}
                                  onClick={(e) => openDeleteModal(note.id, e)} 
                                  className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-700 transition-colors"
                                  title="Delete note"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-slate-400 whitespace-pre-wrap mb-3 line-clamp-3">{note.content || "Empty note..."}</p>
                            <div className="text-xs text-slate-500">{note.date}</div>
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>
            )}
            {activeSidebarTab === 'todos' && (
              <div>
                {todos.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <p>No tasks yet.</p>
                    <button onClick={handleCreateTodo} className="text-blue-400 hover:text-blue-300 text-sm mt-2 font-medium">Create your first task</button>
                  </div>
                ) : (
                  <Reorder.Group 
                    axis="y" 
                    values={todos} 
                    onReorder={setTodos} 
                    className="space-y-3 list-none p-0 m-0"
                  >
                    {todos.map(todo => (
                      <Reorder.Item 
                        key={todo.id} 
                        value={todo}
                        whileDrag={{ 
                          scale: 1.02, 
                          zIndex: 50, 
                          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.5)" 
                        }}
                        className={`bg-slate-900 rounded-xl border ${todo.completed ? 'border-slate-800 bg-slate-900/50' : 'border-slate-700'} overflow-hidden cursor-grab active:cursor-grabbing hover:border-slate-500 transition-colors select-none list-none relative group/todo flex flex-col`}
                        onClick={(e) => handleEditTodo(todo, e)}
                      >
                        <div className="p-3 flex items-start gap-2.5">
                          <div 
                            className="text-slate-500 group-hover/todo:text-slate-300 p-0.5 -ml-1 mt-0.5 rounded transition-colors flex-shrink-0"
                            title="Drag to reorder"
                          >
                            <GripVertical size={16} />
                          </div>
                          <button 
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => toggleTodoCompletion(todo.id, e)} 
                            className={`mt-0.5 flex-shrink-0 transition-colors ${todo.completed ? 'text-green-500' : 'text-slate-400 hover:text-white'}`}
                            title={todo.completed ? "Mark incomplete" : "Mark complete"}
                          >
                            {todo.completed ? <CheckCircle size={18} /> : <CircleIcon size={18} />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm whitespace-pre-wrap line-clamp-3 ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-300'}`}>
                              {todo.text || "Empty task..."}
                            </p>
                            <div className="text-xs text-slate-500 mt-1">{todo.date}</div>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover/todo:opacity-100 transition-opacity flex-shrink-0">
                            <button 
                              type="button"
                              onPointerDown={(e) => e.stopPropagation()}
                              onClick={(e) => openDeleteTodoModal(todo.id, e)} 
                              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-700 transition-colors"
                              title="Delete task"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </Reorder.Item>
                    ))}
                  </Reorder.Group>
                )}
              </div>
            )}
            {activeSidebarTab === 'import' && (
              <div className="space-y-4">
                <div className="text-center text-slate-500 mt-10">
                  <Upload size={40} className="mx-auto mb-4 opacity-50" />
                  <p>Upload a Markdown file containing a file tree to generate a flow on the canvas.</p>
                  <label className="mt-6 cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors font-medium">
                    <Upload size={18} className="mr-2" />
                    Upload .md File
                    <input type="file" accept=".md" className="hidden" onChange={handleFileUpload} />
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-900 relative overflow-hidden">
        {/* Canvas header */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 pointer-events-none z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${project.color} opacity-80`} />
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
          </div>
          <div className="ml-auto pointer-events-auto flex items-center gap-2">
            {/* Undo / Redo Controls */}
            <div className="bg-slate-800 px-1.5 py-1 rounded-full border border-slate-700 shadow-md flex items-center gap-1">
              <button 
                type="button"
                onClick={handleUndo}
                disabled={history.past.length === 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed rounded-full hover:bg-slate-700 transition-colors"
                title="Undo (Ctrl+Z)"
              >
                <Undo2 size={16} />
              </button>
              <button 
                type="button"
                onClick={handleRedo}
                disabled={history.future.length === 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed rounded-full hover:bg-slate-700 transition-colors"
                title="Redo (Ctrl+Y)"
              >
                <Redo2 size={16} />
              </button>
            </div>

            <div className="group relative flex items-center">
              <div 
                onWheel={(e) => {
                  e.preventDefault();
                  const zoomFactor = Math.exp(-e.deltaY * 0.0005);
                  setZoom((prevZoom) => Math.min(Math.max(0.1, prevZoom * zoomFactor), 3));
                }}
                className="bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-300 border border-slate-700 shadow-md flex items-center gap-2 transition-all"
              >
                <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
                <div className="w-0 overflow-hidden group-hover:w-32 transition-all duration-300 ease-out flex items-center ml-0 group-hover:ml-2">
                  <input 
                    type="range" 
                    min="0.1" 
                    max="3" 
                    step="0.05" 
                    value={zoom} 
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    onWheel={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const zoomFactor = Math.exp(-e.deltaY * 0.0005);
                      setZoom((prevZoom) => Math.min(Math.max(0.1, prevZoom * zoomFactor), 3));
                    }}
                    className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Interactive Canvas */}
        <div 
          ref={canvasRef}
          className={`w-full h-full relative select-none ${isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          style={{
            backgroundImage: `linear-gradient(to right, rgba(51, 65, 85, 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgba(51, 65, 85, 0.5) 1px, transparent 1px)`,
            backgroundSize: `${40 * zoom}px ${40 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`
          }}
          onDragOver={onDragOverCanvas}
          onDrop={onDropCanvas}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        >
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-600">
                <div className="w-64 h-64 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  Canvas Area
                </div>
                <p>Drag shapes from the bottom bar to build your flow.</p>
                <p className="text-sm mt-2">Space + Drag to pan. Ctrl + Scroll to zoom. Delete to remove selected. Ctrl+Z / Ctrl+Y to undo/redo.</p>
              </div>
            </div>
          )}

          {/* Transformed Inner Canvas Layer */}
          <div 
            className="absolute inset-0 w-full h-full origin-top-left"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
          >
            {/* Connections (SVG Layer) */}
            <svg className="absolute inset-0 overflow-visible pointer-events-none z-0">
              {connections.map(conn => {
                const fromNode = nodes.find(n => n.id === conn.from);
                const toNode = nodes.find(n => n.id === conn.to);
                if (!fromNode || !toNode) return null;
                
                const fromW = fromNode.width || 96;
                const fromH = fromNode.height || 96;
                const fromHandle = conn.fromHandle || 'right';
                let startX = fromNode.x + fromW / 2;
                let startY = fromNode.y + fromH / 2;
                let cp1X = startX; 
                let cp1Y = startY;
                
                if (fromHandle === 'right') { startX += fromW / 2; cp1X += 50; }
                if (fromHandle === 'left') { startX -= fromW / 2; cp1X -= 50; }
                if (fromHandle === 'bottom') { startY += fromH / 2; cp1Y += 50; }
                if (fromHandle === 'top') { startY -= fromH / 2; cp1Y -= 50; }

                const toW = toNode.width || 96;
                const toH = toNode.height || 96;
                const targetCenterX = toNode.x + toW / 2;
                const targetCenterY = toNode.y + toH / 2;
                
                let endX = targetCenterX;
                let endY = targetCenterY;
                let cp2X, cp2Y;
                
                if (conn.toHandle) {
                  if (conn.toHandle === 'left') {
                    endX = toNode.x - 4;
                  } else if (conn.toHandle === 'right') {
                    endX = toNode.x + toW + 4;
                  } else if (conn.toHandle === 'top') {
                    endY = toNode.y - 4;
                  } else if (conn.toHandle === 'bottom') {
                    endY = toNode.y + toH + 4;
                  }
                  cp2X = endX;
                  cp2Y = endY;
                  if (conn.toHandle === 'left') cp2X -= 50;
                  else if (conn.toHandle === 'right') cp2X += 50;
                  else if (conn.toHandle === 'top') cp2Y -= 50;
                  else if (conn.toHandle === 'bottom') cp2Y += 50;
                } else {
                  const dx = targetCenterX - startX;
                  const dy = targetCenterY - startY;
                  
                  if (Math.abs(dx) > Math.abs(dy)) {
                    endX = dx > 0 ? toNode.x - 4 : toNode.x + toW + 4;
                  } else {
                    endY = dy > 0 ? toNode.y - 4 : toNode.y + toH + 4;
                  }
                  
                  cp2X = endX;
                  cp2Y = endY;
                  if (endX < toNode.x) cp2X -= 50;
                  else if (endX > toNode.x + toW - 10) cp2X += 50;
                  else if (endY < toNode.y) cp2Y -= 50;
                  else if (endY > toNode.y + toH - 10) cp2Y += 50;
                }
                
                const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
                
                return (
                  <g 
                    key={conn.id} 
                    className="group/conn cursor-pointer pointer-events-auto"
                    onMouseDown={(e) => { e.stopPropagation(); deleteConnection(conn.id); }}
                  >
                    <path d={pathData} fill="none" stroke="transparent" strokeWidth="20" />
                    <path
                      d={pathData}
                      fill="none"
                      className="stroke-blue-500 group-hover/conn:stroke-red-500 transition-colors"
                      strokeWidth="3"
                      markerEnd="url(#arrowhead)"
                    />
                  </g>
                );
              })}
              
              {/* Active drawing connection */}
              {drawingConnection && (
                <path
                  d={`M ${drawingConnection.startX} ${drawingConnection.startY} C ${drawingConnection.fromHandle === 'right' ? drawingConnection.startX + 50 : drawingConnection.fromHandle === 'left' ? drawingConnection.startX - 50 : drawingConnection.startX} ${drawingConnection.fromHandle === 'bottom' ? drawingConnection.startY + 50 : drawingConnection.fromHandle === 'top' ? drawingConnection.startY - 50 : drawingConnection.startY}, ${drawingConnection.currentX} ${drawingConnection.currentY}, ${drawingConnection.currentX} ${drawingConnection.currentY}`}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="3"
                  strokeDasharray="5,5"
                  markerEnd="url(#arrowhead)"
                />
              )}

              <defs>
                <marker id="arrowhead" markerWidth="7" markerHeight="5" refX="6" refY="2.5" orient="auto">
                  <polygon points="0 0, 7 2.5, 0 5" fill="#3b82f6" />
                </marker>
              </defs>
            </svg>

            {/* Selection Box */}
            {selectionBox && (
              <div 
                className="absolute border border-blue-400 bg-blue-500/20 z-50 pointer-events-none"
                style={{
                  left: Math.min(selectionBox.startX, selectionBox.endX),
                  top: Math.min(selectionBox.startY, selectionBox.endY),
                  width: Math.abs(selectionBox.startX - selectionBox.endX),
                  height: Math.abs(selectionBox.startY - selectionBox.endY)
                }}
              />
            )}

            {/* Multi-selection Bounding Box & Group Delete */}
            {selectionBounds && !drawingConnection && (
              <div
                style={{
                  left: selectionBounds.x - 8,
                  top: selectionBounds.y - 8,
                  width: selectionBounds.width + 16,
                  height: selectionBounds.height + 16,
                }}
                className="absolute border-2 border-dashed border-blue-400/80 bg-blue-500/5 rounded-xl pointer-events-none z-15"
              >
                {/* Count badge */}
                <div className="absolute -top-3 left-2 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow pointer-events-none select-none">
                  {selectionBounds.count} selected
                </div>

                {/* Close Red Button on the Selection */}
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    deleteSelectedNodes();
                  }}
                  className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all z-30 shadow-lg pointer-events-auto cursor-pointer"
                  title={`Delete ${selectionBounds.count} selected shapes (Delete)`}
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            )}

            {/* Render Nodes */}
            {nodes.map(node => {
              const isText = node.type === 'Text';
              const isSquare = node.type === 'Square';
              const w = node.width || 96;
              const h = node.height || 96;
              const nodeStyle = isSquare ? { left: node.x, top: node.y, width: w, height: h } : { left: node.x, top: node.y };
              const nodeClass = isText 
                ? 'w-fit h-fit min-w-[6rem] min-h-[6rem] max-w-[16rem]' 
                : isSquare ? '' : 'w-24 h-24';

              return (
              <div
                key={node.id}
                style={nodeStyle}
                className={`absolute group z-10 flex items-center justify-center p-4 ${nodeClass} ${selectedNodeIds.includes(node.id) ? 'ring-2 ring-blue-500 rounded-lg bg-blue-500/10' : ''}`}
                onMouseDown={(e) => startDragNode(e, node)}
                onMouseUp={(e) => handleNodeMouseUp(e, node)}
                onMouseMove={(e) => handleNodeHoverMove(e, node)}
                onMouseLeave={() => setHoveredEdge(null)}
              >
                {/* Shape */}
                <div 
                  className="absolute inset-0 bg-slate-800 border-2 border-slate-600 group-hover:border-blue-400 transition-colors shadow-lg"
                  style={getShapeStyles(node.type)}
                />
                
                {/* Text Input */}
                <div className="relative z-11 flex items-center justify-center w-full h-full pointer-events-none">
                  <div className="grid w-full min-w-0 pointer-events-auto">
                    <div className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-words text-center text-sm font-medium px-1 min-w-0">
                      {node.text || 'Type...'}
                      {' '}
                    </div>
                    <textarea
                      value={node.text}
                      onChange={(e) => updateNodeText(node.id, e.target.value)}
                      onFocus={(e) => {
                        textBeforeEditRef.current = { id: node.id, text: e.target.value };
                      }}
                      onBlur={(e) => {
                        if (textBeforeEditRef.current && textBeforeEditRef.current.id === node.id && textBeforeEditRef.current.text !== e.target.value) {
                          const prevNodes = nodesRef.current.map(n => n.id === node.id ? { ...n, text: textBeforeEditRef.current.text } : { ...n });
                          pushHistory(prevNodes, connectionsRef.current);
                          textBeforeEditRef.current = null;
                        }
                      }}
                      onMouseDown={(e) => {
                        if (isSpacePressed) return;
                        e.stopPropagation();
                      }} 
                      placeholder="Type..."
                      className={`col-start-1 row-start-1 resize-none overflow-hidden bg-transparent text-center text-sm font-medium text-white focus:outline-none placeholder-slate-500 break-words whitespace-pre-wrap px-1 min-w-0 ${isSquare ? 'w-full h-full' : ''}`}
                      rows={1}
                    />
                  </div>
                </div>

                {/* Resize Handle for Square */}
                {isSquare && (
                  <div 
                    className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-30"
                    onMouseDown={(e) => startResizeNode(e, node)}
                    title="Resize shape"
                  >
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-white">
                      <polyline points="21 15 21 21 15 21"></polyline>
                      <line x1="21" y1="21" x2="14" y2="14"></line>
                    </svg>
                  </div>
                )}

                {/* Connect Buttons */}
                <button 
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge?.id === node.id && hoveredEdge?.edge === 'top' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  onMouseDown={(e) => startConnection(e, node, 'top')}
                  title="Drag to connect from top"
                >
                  <Plus size={14} className="text-white" />
                </button>
                <button 
                  className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge?.id === node.id && hoveredEdge?.edge === 'bottom' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  onMouseDown={(e) => startConnection(e, node, 'bottom')}
                  title="Drag to connect from bottom"
                >
                  <Plus size={14} className="text-white" />
                </button>
                <button 
                  className={`absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge?.id === node.id && hoveredEdge?.edge === 'left' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  onMouseDown={(e) => startConnection(e, node, 'left')}
                  title="Drag to connect from left"
                >
                  <Plus size={14} className="text-white" />
                </button>
                <button 
                  className={`absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge?.id === node.id && hoveredEdge?.edge === 'right' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                  onMouseDown={(e) => startConnection(e, node, 'right')}
                  title="Drag to connect from right"
                >
                  <Plus size={14} className="text-white" />
                </button>

                {/* Delete Button */}
                <button 
                  className={`absolute -top-3 -right-3 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all z-20 shadow-lg ${selectedNodeIds.includes(node.id) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    if (selectedNodeIds.includes(node.id) && selectedNodeIds.length > 1) {
                      deleteSelectedNodes();
                    } else {
                      deleteNode(e, node.id);
                    }
                  }}
                  title="Delete node"
                >
                  <X size={12} className="text-white" />
                </button>
              </div>
            );
          })}
          </div>
        </div>

        {/* Bottom Navbar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20">
          <div className="bg-slate-800 border border-slate-700 shadow-2xl rounded-2xl p-2 flex items-center gap-2">
            <div draggable onDragStart={(e) => onDragStartNavbar(e, 'Square')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative cursor-grab active:cursor-grabbing" title="Square">
              <Square size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Square</span>
            </div>
            <div draggable onDragStart={(e) => onDragStartNavbar(e, 'Circle')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative cursor-grab active:cursor-grabbing" title="Circle">
              <Circle size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Circle</span>
            </div>
            <div draggable onDragStart={(e) => onDragStartNavbar(e, 'Triangle')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative cursor-grab active:cursor-grabbing" title="Triangle">
              <Triangle size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Triangle</span>
            </div>
            <div draggable onDragStart={(e) => onDragStartNavbar(e, 'Hexagon')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative cursor-grab active:cursor-grabbing" title="Hexagon">
              <Hexagon size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Hexagon</span>
            </div>
            <div className="w-px h-8 bg-slate-700 mx-1"></div>
            <div draggable onDragStart={(e) => onDragStartNavbar(e, 'Text')} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-all hover:-translate-y-1 group relative cursor-grab active:cursor-grabbing" title="Text Only">
              <Type size={22} />
              <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">Text</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes scaleUp {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scaleDown {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.95); }
        }
      `}</style>

      {/* Note Modal */}
      {(isNoteModalOpen || isNoteModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          style={{ animation: isNoteModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-lg shadow-2xl"
            style={{ animation: isNoteModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <input 
              type="text" 
              value={noteTitleInput} 
              onChange={(e) => setNoteTitleInput(e.target.value)} 
              className="w-full bg-slate-900 text-white text-xl font-bold px-4 py-3 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700" 
              placeholder="Note Title" 
            />
            <textarea 
              value={noteInput} 
              onChange={(e) => setNoteInput(e.target.value)} 
              className="w-full bg-slate-900 text-slate-300 px-4 py-3 rounded-lg mb-4 min-h-[200px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700" 
              placeholder="Write your note here..." 
            />
            <div className="flex justify-end gap-3">
              <button onClick={handleCancelEdit} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleSaveNote} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 font-medium"><Save size={18} /> Save Note</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {(isDeleteModalOpen || isDeleteModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          style={{ animation: isDeleteModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl"
            style={{ animation: isDeleteModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Delete Note</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this note? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={() => handleDeleteNoteConfirm(noteToDelete)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Todo Modal */}
      {(isTodoModalOpen || isTodoModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          style={{ animation: isTodoModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-4xl shadow-2xl flex flex-col"
            style={{ animation: isTodoModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out', height: '85vh' }}
          >
            <h3 className="text-xl font-bold text-white mb-4">Task Details</h3>
            <textarea 
              value={todoInput} 
              onChange={(e) => setTodoInput(e.target.value)} 
              className="flex-1 w-full bg-slate-900 text-slate-300 px-4 py-3 rounded-lg mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 text-lg" 
              placeholder="Write your task here..." 
            />
            <div className="flex justify-between gap-3 mt-auto">
              <button 
                onClick={(e) => { openDeleteTodoModal(editingTodoId, e); }} 
                className="px-4 py-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center gap-2"
              >
                <Trash2 size={18} /> Delete
              </button>
              <div className="flex gap-3">
                <button onClick={handleCancelEditTodo} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={handleSaveTodo} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 font-medium"><Save size={18} /> Save Task</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Todo Confirmation Modal */}
      {(isDeleteTodoModalOpen || isDeleteTodoModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          style={{ animation: isDeleteTodoModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl"
            style={{ animation: isDeleteTodoModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Delete Task</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to delete this task? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteTodoModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={() => handleDeleteTodoConfirm(todoToDelete)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  Redo2, 
  RefreshCcw,
  Copy,
  ClipboardPaste,
  GitBranch,
  Sparkles,
  Star,
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Unlink,
  Link2
} from 'lucide-react';
import { Reorder } from 'framer-motion';
import { getNotes, saveNotes, getCanvas, saveCanvas, getTodos, saveTodos, getTrash, saveTrash } from '../data/storage';

import LayoutTree from './LayoutTree';
import CanvasNode from './CanvasNode';
import CanvasConnection from './CanvasConnection';
import SelectionBox from './SelectionBox';
import SelectionBounds from './SelectionBounds';
import NestedTodoItem from './NestedTodoItem';

const ProjectWorkspace = ({ project, onBack }) => {
  if (!project) return null;

  const [activeSidebarTab, setActiveSidebarTab] = useState('todos'); 

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

  const pushHistory = useCallback((pastNodes = nodesRef.current, pastConnections = connectionsRef.current) => {
    const nodesClone = pastNodes.map(n => ({ ...n }));
    const connsClone = pastConnections.map(c => ({ ...c }));
    setHistory(curr => ({
      past: [...curr.past.slice(-30), { nodes: nodesClone, connections: connsClone }],
      future: []
    }));
  }, []);

  // Hierarchical Workflow Auto-Alignment Algorithm
  const autoAlignWorkflow = useCallback((currentNodes, currentConns) => {
    if (!currentNodes || currentNodes.length === 0) return { nodes: currentNodes, connections: currentConns };

    const allNodes = currentNodes;
    const allNodeIds = new Set(allNodes.map(n => n.id));
    const allConns = (currentConns || []).filter(c => allNodeIds.has(c.from) && allNodeIds.has(c.to));
    
    const nodeMap = new Map();
    allNodes.forEach(n => nodeMap.set(n.id, n));

    const incomingCount = new Map();
    const childrenMap = new Map();
    allNodes.forEach(n => {
      incomingCount.set(n.id, 0);
      childrenMap.set(n.id, []);
    });

    allConns.forEach(c => {
      incomingCount.set(c.to, (incomingCount.get(c.to) || 0) + 1);
      childrenMap.get(c.from).push(c.to);
    });

    let rootNodes = allNodes.filter(n => n.isRoot);
    if (rootNodes.length === 0) {
      rootNodes = allNodes.filter(n => incomingCount.get(n.id) === 0);
    }
    if (rootNodes.length === 0 && allNodes.length > 0) {
      rootNodes = [allNodes[0]];
    }

    const subtreeWidthCache = new Map();
    const getSubtreeWidth = (nodeId, visited = new Set()) => {
      if (visited.has(nodeId)) return 0;
      if (subtreeWidthCache.has(nodeId)) return subtreeWidthCache.get(nodeId);
      visited.add(nodeId);
      
      const node = nodeMap.get(nodeId);
      if (!node) return 0;
      const nodeW = node.width || 120;
      const hGap = 60;
      const children = (childrenMap.get(nodeId) || []).filter(cId => !visited.has(cId));
      
      let width = 0;
      if (children.length === 0) {
        width = nodeW + hGap;
      } else {
        let sumChildW = 0;
        for (const cId of children) {
          sumChildW += getSubtreeWidth(cId, new Set(visited));
        }
        width = Math.max(nodeW + hGap, sumChildW);
      }
      subtreeWidthCache.set(nodeId, width);
      return width;
    };

    const positions = new Map();
    const visitedForLayout = new Set();

    const layoutNode = (nodeId, leftX, topY) => {
      if (visitedForLayout.has(nodeId)) return;
      visitedForLayout.add(nodeId);
      const node = nodeMap.get(nodeId);
      if (!node) return;

      const nodeW = node.width || 120;
      const nodeH = node.height || (node.type === 'Circle' ? 120 : 80);
      const subW = getSubtreeWidth(nodeId);

      const posX = leftX + (subW - nodeW) / 2;
      const posY = topY;
      positions.set(nodeId, { x: Math.round(posX), y: Math.round(posY) });

      const children = (childrenMap.get(nodeId) || []).filter(cId => !visitedForLayout.has(cId));
      if (children.length > 0) {
        const childTotalW = children.reduce((acc, cId) => acc + getSubtreeWidth(cId), 0);
        let curChildLeft = leftX;
        if (subW > childTotalW) {
          curChildLeft += (subW - childTotalW) / 2;
        }
        const vGap = 120;
        const childTopY = posY + nodeH + vGap;

        for (const cId of children) {
          const cW = getSubtreeWidth(cId);
          layoutNode(cId, curChildLeft, childTopY);
          curChildLeft += cW;
        }
      }
    };

    let curTreeLeft = 100;
    rootNodes.forEach(r => {
      if (!visitedForLayout.has(r.id)) {
        layoutNode(r.id, curTreeLeft, 80);
        curTreeLeft += getSubtreeWidth(r.id) + 80;
      }
    });

    allNodes.forEach(n => {
      if (!visitedForLayout.has(n.id)) {
        layoutNode(n.id, curTreeLeft, 80);
        curTreeLeft += getSubtreeWidth(n.id) + 80;
      }
    });

    const updatedNodes = currentNodes.map(n => {
      const pos = positions.get(n.id);
      if (pos) {
        return { ...n, x: pos.x, y: pos.y };
      }
      return n;
    });

    const updatedConns = currentConns.map(c => {
      if (allNodeIds.has(c.from) && allNodeIds.has(c.to)) {
        return { ...c, fromHandle: 'bottom', toHandle: 'top' };
      }
      return c;
    });

    return { nodes: updatedNodes, connections: updatedConns };
  }, []);

  useEffect(() => {
    getCanvas(project.id).then(initialCanvas => {
      let initialNodes = initialCanvas.nodes || [];
      let initialConnections = initialCanvas.connections || [];

      // For new projects or empty canvas: auto-create the root node with project title
      if (initialNodes.length === 0) {
        const title = project.name || 'Project';
        const baseWidth = 120;
        const maxWidth = 240;
        const charWidth = 8;
        const estimatedTextWidth = title.length * charWidth;
        const circleWidth = Math.min(maxWidth, Math.max(baseWidth, estimatedTextWidth + 40));
        const innerWidth = maxWidth - 40;
        const estimatedLines = Math.max(1, Math.ceil(estimatedTextWidth / innerWidth));
        const circleHeight = Math.max(120, estimatedLines * 24 + 60);

        const rootNode = {
          id: 'root-' + project.id,
          type: 'Circle',
          nodeType: 'flow',
          isRoot: true,
          text: title,
          width: circleWidth,
          height: circleHeight,
          x: 450 - circleWidth / 2,
          y: 80
        };
        initialNodes = [rootNode];
      }

      setNodes(initialNodes);
      setConnections(initialConnections);
      setIsCanvasLoaded(true);
      setHistory({ past: [], future: [] });
    });
  }, [project.id, project.name]);

  // Debounced auto-save for canvas to prevent hammering the network and disk during dragging
  const canvasSaveTimerRef = useRef(null);
  const pendingCanvasDataRef = useRef(null);

  useEffect(() => {
    if (!isCanvasLoaded) return;
    pendingCanvasDataRef.current = { nodes, connections };
    if (canvasSaveTimerRef.current) {
      clearTimeout(canvasSaveTimerRef.current);
    }
    canvasSaveTimerRef.current = setTimeout(() => {
      if (pendingCanvasDataRef.current) {
        saveCanvas(project.id, pendingCanvasDataRef.current);
        pendingCanvasDataRef.current = null;
      }
    }, 400);

    return () => {
      if (canvasSaveTimerRef.current) {
        clearTimeout(canvasSaveTimerRef.current);
      }
    };
  }, [nodes, connections, project.id, isCanvasLoaded]);

  // Trash State
  const [trash, setTrash] = useState([]);
  const [isTrashLoaded, setIsTrashLoaded] = useState(false);
  const [trashFilter, setTrashFilter] = useState('all'); // 'all' | 'notes' | 'todos'
  const [previewTrashItem, setPreviewTrashItem] = useState(null);
  const [itemToPermanentDelete, setItemToPermanentDelete] = useState(null);
  const [isPermanentDeleteModalOpen, setIsPermanentDeleteModalOpen] = useState(false);
  const [isPermanentDeleteModalClosing, setIsPermanentDeleteModalClosing] = useState(false);
  const [isEmptyTrashModalOpen, setIsEmptyTrashModalOpen] = useState(false);
  const [isEmptyTrashModalClosing, setIsEmptyTrashModalClosing] = useState(false);

  useEffect(() => {
    getTrash(project.id).then(data => {
      setTrash(data || []);
      setIsTrashLoaded(true);
    });
  }, [project.id]);

  const trashRef = useRef(trash);
  useEffect(() => {
    trashRef.current = trash;
  }, [trash]);

  useEffect(() => { 
    if (isTrashLoaded) {
      const timer = setTimeout(() => {
        saveTrash(project.id, trash); 
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [trash, project.id, isTrashLoaded]);

  // Notes state
  const [notes, setNotes] = useState([]);
  const [isNotesLoaded, setIsNotesLoaded] = useState(false);
  
  useEffect(() => {
    getNotes(project.id).then(data => {
      setNotes(data || []);
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

  const closeNoteModal = useCallback(() => {
    setIsNoteModalClosing(true);
    setTimeout(() => {
      setIsNoteModalOpen(false);
      setIsNoteModalClosing(false);
    }, 200);
  }, []);

  const closeDeleteModal = useCallback(() => {
    setIsDeleteModalClosing(true);
    setTimeout(() => {
      setIsDeleteModalOpen(false);
      setIsDeleteModalClosing(false);
      setNoteToDelete(null);
    }, 200);
  }, []);

  const handleCreateNote = useCallback(() => {
    const newNote = { id: Date.now(), title: 'New Note', content: '', date: new Date().toLocaleDateString() };
    setNotes(prev => [newNote, ...prev]);
    setEditingNoteId(newNote.id);
    setNoteTitleInput(newNote.title);
    setNoteInput(newNote.content);
    setActiveSidebarTab('notes');
    setIsNoteModalOpen(true);
  }, []);

  const handleSaveNote = useCallback(() => {
    setNotes(prev => prev.map(n => n.id === editingNoteId ? { ...n, title: noteTitleInput, content: noteInput } : n));
    setEditingNoteId(null);
    closeNoteModal();
  }, [editingNoteId, noteTitleInput, noteInput, closeNoteModal]);

  const handleDeleteNoteConfirm = useCallback((id) => {
    const noteToDeleteObj = notesRef.current.find(n => n.id === id);
    if (noteToDeleteObj) {
      setTrash(prev => [
        { 
          ...noteToDeleteObj, 
          itemType: 'note', 
          deletedAt: new Date().toLocaleDateString() 
        }, 
        ...prev
      ]);
    }
    setNotes(prev => prev.filter(n => n.id !== id));
    if (editingNoteId === id) {
      setEditingNoteId(null);
      closeNoteModal();
    }
    closeDeleteModal();
  }, [editingNoteId, closeNoteModal, closeDeleteModal]);

  const openDeleteModal = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setNoteToDelete(id);
    setIsDeleteModalOpen(true);
  }, []);

  const handleEditNote = useCallback((note) => {
    setEditingNoteId(note.id);
    setNoteTitleInput(note.title);
    setNoteInput(note.content);
    setIsNoteModalOpen(true);
  }, []);

  const handleCancelEdit = useCallback(() => {
    const note = notesRef.current.find(n => n.id === editingNoteId);
    if (note && !note.content && (!note.title || !note.title.trim() || note.title === 'New Note')) {
      setNotes(prev => prev.filter(n => n.id !== editingNoteId));
    }
    setEditingNoteId(null);
    closeNoteModal();
  }, [editingNoteId, closeNoteModal]);

  // Todo State
  const [todos, setTodos] = useState([]);
  const [isTodosLoaded, setIsTodosLoaded] = useState(false);
  
  useEffect(() => {
    getTodos(project.id).then(data => {
      setTodos(data || []);
      setIsTodosLoaded(true);
    });
  }, [project.id]);

  const todosRef = useRef(todos);
  useEffect(() => {
    todosRef.current = todos;
  }, [todos]);

  const todosMap = useMemo(() => {
    const map = new Map();
    todos.forEach(t => map.set(t.id, t));
    return map;
  }, [todos]);

  // Nested collapsible/expandable state for todos
  const [expandedNodeIds, setExpandedNodeIds] = useState(new Set());

  const handleToggleExpand = useCallback((nodeId, e) => {
    if (e) e.stopPropagation();
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Compute hierarchical tree of todos based on connections
  const todoTreeData = useMemo(() => {
    const todoMap = new Map();
    todos.forEach(t => todoMap.set(t.id, t));

    const rootNode = nodes.find(n => n.isRoot);
    const rootId = rootNode ? rootNode.id : null;

    const childrenByParent = new Map();
    const parentOfTodo = new Map();

    connections.forEach(conn => {
      if (todoMap.has(conn.to)) {
        if (conn.from === rootId || todoMap.has(conn.from)) {
          if (!parentOfTodo.has(conn.to)) {
            parentOfTodo.set(conn.to, conn.from);
            if (!childrenByParent.has(conn.from)) {
              childrenByParent.set(conn.from, []);
            }
            childrenByParent.get(conn.from).push(todoMap.get(conn.to));
          }
        }
      }
    });

    const topLevelTodos = [];
    const processed = new Set();

    // 1) First add nodes connected directly to Root
    if (rootId && childrenByParent.has(rootId)) {
      childrenByParent.get(rootId).forEach(t => {
        topLevelTodos.push(t);
        processed.add(t.id);
      });
    }

    // 2) Then add top-level standalone nodes or nodes without an active parent todo
    todos.forEach(t => {
      if (!processed.has(t.id)) {
        const pId = parentOfTodo.get(t.id);
        if (!pId || !todoMap.has(pId)) {
          topLevelTodos.push(t);
          processed.add(t.id);
        }
      }
    });

    return { topLevelTodos, childrenByParent };
  }, [todos, connections, nodes]);

  // All parent todo IDs that have connected sub-nodes
  const allParentIds = useMemo(() => {
    const set = new Set();
    connections.forEach(c => {
      if (todosMap.has(c.from)) {
        set.add(c.from);
      }
    });
    return set;
  }, [connections, todosMap]);

  const allExpanded = allParentIds.size > 0 && Array.from(allParentIds).every(id => expandedNodeIds.has(id));

  const handleToggleExpandAll = useCallback(() => {
    if (allExpanded) {
      setExpandedNodeIds(new Set());
    } else {
      setExpandedNodeIds(new Set(allParentIds));
    }
  }, [allExpanded, allParentIds]);

  const handleSwitchTodoType = useCallback((todoId, nextType, e) => {
    if (e) e.stopPropagation();
    pushHistory();
    setTodos(prev => prev.map(t => t.id === todoId ? { ...t, nodeType: nextType } : t));
    setNodes(prev => prev.map(n => n.id === todoId ? { ...n, nodeType: nextType } : n));
  }, [pushHistory]);

  const handleCreateSubTodo = useCallback((parentId, e) => {
    if (e) e.stopPropagation();
    const activeNodes = (nodesRef.current || []).filter(n => !n.isDeleted);
    const parentNode = activeNodes.find(n => n.id === parentId);
    const defaultParent = parentNode ? parentNode.id : (activeNodes[0]?.id || '');

    setEditingTodoId(null);
    setTodoInput('');
    setTodoNodeType('task');
    setTodoShape('Square');
    setTodoConnectTo(defaultParent);
    setNavParentId(defaultParent || null);
    setActiveSidebarTab('todos');
    setIsTodoModalOpen(true);
    
    // Automatically expand the parent node so new child is visible
    setExpandedNodeIds(prev => new Set(prev).add(parentId));
  }, []);

  useEffect(() => { 
    if (isTodosLoaded) {
      const timer = setTimeout(() => {
        saveTodos(project.id, todos); 
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [todos, project.id, isTodosLoaded]);

  const [editingTodoId, setEditingTodoId] = useState(null);
  const [todoInput, setTodoInput] = useState('');
  const [todoNodeType, setTodoNodeType] = useState('task'); // 'task' | 'flow'
  const [todoShape, setTodoShape] = useState('Square'); // 'Square' | 'Circle' | 'Triangle' | 'Hexagon' | 'Text'
  const [todoConnectTo, setTodoConnectTo] = useState(''); // parent node id
  const [navParentId, setNavParentId] = useState(null); // id of node currently navigated into
  
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [isTodoModalClosing, setIsTodoModalClosing] = useState(false);
  const [isDeleteTodoModalOpen, setIsDeleteTodoModalOpen] = useState(false);
  const [isDeleteTodoModalClosing, setIsDeleteTodoModalClosing] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState(null);
  
  const closeTodoModal = useCallback(() => {
    setIsTodoModalClosing(true);
    setTimeout(() => {
      setIsTodoModalOpen(false);
      setIsTodoModalClosing(false);
    }, 200);
  }, []);

  const closeDeleteTodoModal = useCallback(() => {
    setIsDeleteTodoModalClosing(true);
    setTimeout(() => {
      setIsDeleteTodoModalOpen(false);
      setIsDeleteTodoModalClosing(false);
      setTodoToDelete(null);
    }, 200);
  }, []);

  const handleCreateTodo = useCallback(() => {
    const activeNodes = (nodesRef.current || []).filter(n => !n.isDeleted);
    const rootNode = activeNodes.find(n => n.isRoot);
    const defaultParent = rootNode ? rootNode.id : (activeNodes[0]?.id || '');

    setEditingTodoId(null);
    setTodoInput('');
    setTodoNodeType('task');
    setTodoShape('Square');
    setTodoConnectTo(defaultParent);
    setNavParentId(defaultParent || null);
    setActiveSidebarTab('todos');
    setIsTodoModalOpen(true);
  }, []);

  const handleCancelEditTodo = useCallback(() => {
    setEditingTodoId(null);
    closeTodoModal();
  }, [closeTodoModal]);

  const handleSaveTodo = useCallback(() => {
    const trimmed = todoInput.trim();
    if (!trimmed) {
      handleCancelEditTodo();
      return;
    }

    pushHistory();

    if (editingTodoId) {
      setTodos(prev => prev.map(t => t.id === editingTodoId ? { 
        ...t, 
        text: trimmed, 
        nodeType: todoNodeType, 
        shape: todoShape, 
        connectTo: todoConnectTo 
      } : t));

      const updatedNodes = nodesRef.current.map(n => n.id === editingTodoId ? {
        ...n,
        text: trimmed,
        type: todoShape,
        nodeType: todoNodeType
      } : n);

      const remainingConns = connectionsRef.current.filter(c => c.to !== editingTodoId);
      const updatedConns = [...remainingConns];
      if (todoConnectTo && todoConnectTo !== editingTodoId) {
        updatedConns.push({
          id: 'conn-' + Date.now().toString(),
          from: todoConnectTo,
          fromHandle: 'bottom',
          to: editingTodoId,
          toHandle: 'top'
        });
      }

      const aligned = autoAlignWorkflow(updatedNodes, updatedConns);
      setNodes(aligned.nodes);
      setConnections(aligned.connections);
    } else {
      const newId = Date.now().toString();
      
      let nodeW = 140;
      let nodeH = 80;
      if (todoShape === 'Circle') {
        nodeW = Math.min(240, Math.max(120, trimmed.length * 8));
        nodeH = Math.max(120, Math.ceil((trimmed.length * 8) / 200) * 24 + 60);
      } else if (todoShape === 'Square') {
        nodeW = Math.min(260, Math.max(140, trimmed.length * 7));
        nodeH = Math.max(80, Math.ceil((trimmed.length * 7) / 220) * 22 + 40);
      } else if (todoShape === 'Triangle' || todoShape === 'Hexagon') {
        nodeW = 110;
        nodeH = 110;
      }

      const newNode = {
        id: newId,
        type: todoShape,
        nodeType: todoNodeType,
        text: trimmed,
        width: nodeW,
        height: nodeH,
        x: 0,
        y: 0
      };

      const newTodo = {
        id: newId,
        text: trimmed,
        nodeType: todoNodeType,
        shape: todoShape,
        completed: false,
        date: new Date().toLocaleDateString(),
        connectTo: todoConnectTo
      };

      const newConns = [...connectionsRef.current];
      if (todoConnectTo) {
        newConns.push({
          id: 'conn-' + Date.now().toString(),
          from: todoConnectTo,
          fromHandle: 'bottom',
          to: newId,
          toHandle: 'top'
        });
        setExpandedNodeIds(prev => new Set(prev).add(todoConnectTo));
      }

      const aligned = autoAlignWorkflow([...nodesRef.current, newNode], newConns);
      setTodos(prev => [newTodo, ...prev]);
      setNodes(aligned.nodes);
      setConnections(aligned.connections);
    }

    setEditingTodoId(null);
    closeTodoModal();
  }, [todoInput, editingTodoId, todoNodeType, todoShape, todoConnectTo, pushHistory, autoAlignWorkflow, handleCancelEditTodo, closeTodoModal]);

  const handleEditTodo = useCallback((todo, e) => {
    if (e) e.stopPropagation();
    const matchedNode = nodesRef.current.find(n => n.id === todo.id);
    const inConn = connectionsRef.current.find(c => c.to === todo.id);
    const parentId = inConn ? inConn.from : (todo.connectTo || '');

    setEditingTodoId(todo.id);
    setTodoInput(todo.text || '');
    setTodoNodeType(todo.nodeType || matchedNode?.nodeType || 'task');
    setTodoShape(todo.shape || matchedNode?.type || 'Square');
    setTodoConnectTo(parentId);
    setNavParentId(parentId || null);
    setIsTodoModalOpen(true);
  }, []);

  const toggleTodoCompletion = useCallback((id, e) => {
    if (e) e.stopPropagation();
    pushHistory();
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isCompleted: !n.isCompleted } : n));
  }, [pushHistory]);
  
  const handleDeleteTodoConfirm = useCallback((id) => {
    const nodeToDelete = nodesRef.current.find(n => n.id === id);
    if (nodeToDelete && nodeToDelete.isRoot) {
      closeDeleteTodoModal();
      return;
    }

    pushHistory();

    const todoToDeleteObj = todosRef.current.find(t => t.id === id);
    const incoming = connectionsRef.current.filter(c => c.to === id);
    const outgoing = connectionsRef.current.filter(c => c.from === id);

    // Save to trash
    const trashEntry = {
      id: id,
      itemType: 'todo',
      text: todoToDeleteObj ? todoToDeleteObj.text : (nodeToDelete?.text || ''),
      nodeType: todoToDeleteObj ? todoToDeleteObj.nodeType : (nodeToDelete?.nodeType || 'task'),
      shape: todoToDeleteObj ? todoToDeleteObj.shape : (nodeToDelete?.type || 'Square'),
      completed: todoToDeleteObj ? todoToDeleteObj.completed : false,
      date: todoToDeleteObj ? todoToDeleteObj.date : new Date().toLocaleDateString(),
      deletedAt: new Date().toLocaleDateString(),
      incomingParents: incoming.map(c => c.from),
      outgoingChildren: outgoing.map(c => c.to)
    };
    setTrash(prev => [trashEntry, ...prev]);

    // Remove from active todos
    setTodos(prev => prev.filter(t => t.id !== id));

    // Mark node as deleted on canvas (border line turns red; stays on connection and position!)
    setNodes(prev => prev.map(n => n.id === id ? { ...n, isDeleted: true } : n));

    if (editingTodoId === id) {
      setEditingTodoId(null);
      closeTodoModal();
    }
    closeDeleteTodoModal();
  }, [pushHistory, editingTodoId, closeTodoModal, closeDeleteTodoModal]);

  const openDeleteTodoModal = useCallback((id, e) => {
    if (e) e.stopPropagation();
    setTodoToDelete(id);
    setIsDeleteTodoModalOpen(true);
  }, []);

  const closePermanentDeleteModal = useCallback(() => {
    setIsPermanentDeleteModalClosing(true);
    setTimeout(() => {
      setIsPermanentDeleteModalOpen(false);
      setIsPermanentDeleteModalClosing(false);
      setItemToPermanentDelete(null);
    }, 200);
  }, []);

  const closeEmptyTrashModal = useCallback(() => {
    setIsEmptyTrashModalClosing(true);
    setTimeout(() => {
      setIsEmptyTrashModalOpen(false);
      setIsEmptyTrashModalClosing(false);
    }, 200);
  }, []);

  const handleRestoreItem = useCallback((item, e) => {
    if (e) e.stopPropagation();
    pushHistory();
    if (item.itemType === 'note') {
      const restored = {
        id: item.id,
        title: item.title,
        content: item.content,
        date: item.date || new Date().toLocaleDateString()
      };
      setNotes(prev => [restored, ...prev]);
    } else if (item.itemType === 'todo') {
      const restored = {
        id: item.id,
        text: item.text,
        nodeType: item.nodeType || 'task',
        shape: item.shape || 'Square',
        completed: item.completed || false,
        date: item.date || new Date().toLocaleDateString()
      };
      setTodos(prev => [...prev, restored]);

      // Restore node on canvas (border returns to normal; position and connections preserved!)
      setNodes(prev => prev.map(n => n.id === item.id ? { ...n, isDeleted: false } : n));
    }
    setTrash(prev => prev.filter(t => !(t.id === item.id && t.itemType === item.itemType)));
    setPreviewTrashItem(prev => (prev && prev.id === item.id && prev.itemType === item.itemType ? null : prev));
  }, [pushHistory]);

  const openPermanentDeleteModal = useCallback((item, e) => {
    if (e) e.stopPropagation();
    setItemToPermanentDelete(item);
    setIsPermanentDeleteModalOpen(true);
  }, []);

  const handlePermanentDeleteConfirm = useCallback(() => {
    if (itemToPermanentDelete) {
      pushHistory();
      if (itemToPermanentDelete.itemType === 'todo') {
        // Permanently remove node and its connections from canvas
        setNodes(prev => prev.filter(n => n.id !== itemToPermanentDelete.id));
        setConnections(prev => prev.filter(c => c.from !== itemToPermanentDelete.id && c.to !== itemToPermanentDelete.id));
      }
      setTrash(prev => prev.filter(t => !(t.id === itemToPermanentDelete.id && t.itemType === itemToPermanentDelete.itemType)));
      setPreviewTrashItem(prev => (prev && prev.id === itemToPermanentDelete.id && prev.itemType === itemToPermanentDelete.itemType ? null : prev));
    }
    closePermanentDeleteModal();
  }, [itemToPermanentDelete, pushHistory, closePermanentDeleteModal]);

  const handleEmptyTrashConfirm = useCallback(() => {
    pushHistory();
    const deletedNodeIds = new Set(nodesRef.current.filter(n => n.isDeleted).map(n => n.id));
    setTrash([]);
    setNodes(prev => prev.filter(n => !n.isDeleted));
    setConnections(prev => prev.filter(c => !deletedNodeIds.has(c.from) && !deletedNodeIds.has(c.to)));
    setPreviewTrashItem(null);
    closeEmptyTrashModal();
  }, [pushHistory, closeEmptyTrashModal]);

  // Flush pending changes on unmount
  useEffect(() => {
    return () => {
      if (isNotesLoaded) saveNotes(project.id, notesRef.current);
      if (isTodosLoaded) saveTodos(project.id, todosRef.current);
      if (isTrashLoaded) saveTrash(project.id, trashRef.current);
      if (isCanvasLoaded && pendingCanvasDataRef.current) {
        saveCanvas(project.id, pendingCanvasDataRef.current);
      }
    };
  }, [project.id, isNotesLoaded, isTodosLoaded, isTrashLoaded, isCanvasLoaded]);

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
      selectedNodeIdsRef.current = [];
      
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
      selectedNodeIdsRef.current = [];
      
      return {
        past: newPast,
        future: newFuture
      };
    });
  }, []);

  const canvasRef = useRef(null);
  const [draggingNode, setDraggingNode] = useState(null); 
  const [drawingConnection, setDrawingConnection] = useState(null); 

  const [selectionBox, setSelectionBox] = useState(null);
  const [resizingNode, setResizingNode] = useState(null);

  // Zoom and Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Synchronized refs for zero-re-render event handlers
  const panRef = useRef(pan);
  useEffect(() => { panRef.current = pan; }, [pan]);

  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);

  const isSpacePressedRef = useRef(isSpacePressed);
  useEffect(() => { isSpacePressedRef.current = isSpacePressed; }, [isSpacePressed]);

  const isPanningRef = useRef(isPanning);
  useEffect(() => { isPanningRef.current = isPanning; }, [isPanning]);

  const draggingNodeRef = useRef(draggingNode);
  useEffect(() => { draggingNodeRef.current = draggingNode; }, [draggingNode]);

  const drawingConnectionRef = useRef(drawingConnection);
  useEffect(() => { drawingConnectionRef.current = drawingConnection; }, [drawingConnection]);

  const selectionBoxRef = useRef(selectionBox);
  useEffect(() => { selectionBoxRef.current = selectionBox; }, [selectionBox]);

  const resizingNodeRef = useRef(resizingNode);
  useEffect(() => { resizingNodeRef.current = resizingNode; }, [resizingNode]);

  // Clipboard and Copy/Paste state & refs
  const clipboardRef = useRef(null);
  const mousePosRef = useRef(null);
  const isMouseOverCanvasRef = useRef(false);
  const pasteCountRef = useRef(0);
  const lastPastePosRef = useRef(null);
  const [toastMessage, setToastMessage] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((msg) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToastMessage(msg);
    toastTimerRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 1800);
  }, []);

  // Memoized O(1) indexed lookup map for nodes
  const nodesMap = useMemo(() => {
    const map = new Map();
    for (let i = 0; i < nodes.length; i++) {
      map.set(nodes[i].id, nodes[i]);
    }
    return map;
  }, [nodes]);

  // Memoized Set of selected node IDs
  const selectedNodeIdsSet = useMemo(() => {
    return new Set(selectedNodeIds);
  }, [selectedNodeIds]);

  // Directional Flow Navigator Computations for Modal Connect To Node
  const activeModalNodes = useMemo(() => {
    return nodes.filter(n => !n.isDeleted && n.id !== editingTodoId);
  }, [nodes, editingTodoId]);

  const activeModalNodesMap = useMemo(() => {
    const map = new Map();
    activeModalNodes.forEach(n => map.set(n.id, n));
    return map;
  }, [activeModalNodes]);

  const modalChildrenMap = useMemo(() => {
    const map = new Map();
    connections.forEach(c => {
      if (activeModalNodesMap.has(c.from) && activeModalNodesMap.has(c.to)) {
        if (!map.has(c.from)) map.set(c.from, []);
        map.get(c.from).push(activeModalNodesMap.get(c.to));
      }
    });
    return map;
  }, [connections, activeModalNodesMap]);

  const modalParentMap = useMemo(() => {
    const map = new Map();
    connections.forEach(c => {
      if (activeModalNodesMap.has(c.from) && activeModalNodesMap.has(c.to)) {
        map.set(c.to, activeModalNodesMap.get(c.from));
      }
    });
    return map;
  }, [connections, activeModalNodesMap]);

  const rootModalNode = useMemo(() => {
    return activeModalNodes.find(n => n.isRoot) || activeModalNodes[0] || null;
  }, [activeModalNodes]);

  const currentNavNode = useMemo(() => {
    if (navParentId && activeModalNodesMap.has(navParentId)) {
      return activeModalNodesMap.get(navParentId);
    }
    return rootModalNode;
  }, [navParentId, activeModalNodesMap, rootModalNode]);

  const parentOfCurrentNav = useMemo(() => {
    if (!currentNavNode) return null;
    return modalParentMap.get(currentNavNode.id) || (currentNavNode.id !== rootModalNode?.id ? rootModalNode : null);
  }, [currentNavNode, modalParentMap, rootModalNode]);

  const navBreadcrumbs = useMemo(() => {
    if (!currentNavNode) return [];
    const path = [];
    let curr = currentNavNode;
    const visited = new Set();
    while (curr && !visited.has(curr.id)) {
      visited.add(curr.id);
      path.unshift(curr);
      if (curr.id === rootModalNode?.id) break;
      curr = modalParentMap.get(curr.id) || (curr !== rootModalNode ? rootModalNode : null);
    }
    return path;
  }, [currentNavNode, rootModalNode, modalParentMap]);

  const navChildren = useMemo(() => {
    if (!currentNavNode) return [];
    let direct = modalChildrenMap.get(currentNavNode.id) || [];
    if (currentNavNode.isRoot) {
      const directSet = new Set(direct.map(d => d.id));
      const otherTopLevel = activeModalNodes.filter(n => !n.isRoot && !modalParentMap.has(n.id) && !directSet.has(n.id));
      direct = [...direct, ...otherTopLevel];
    }
    return direct;
  }, [currentNavNode, modalChildrenMap, activeModalNodes, modalParentMap]);

  const deleteSelectedNodes = useCallback(() => {
    const ids = selectedNodeIdsRef.current;
    if (!ids || ids.length === 0) return;
    ids.forEach(id => {
      const targetNode = nodesRef.current.find(n => n.id === id);
      if (targetNode && !targetNode.isRoot) {
        if (targetNode.isDeleted) {
          openPermanentDeleteModal({ id: targetNode.id, itemType: 'todo', text: targetNode.text });
        } else {
          handleDeleteTodoConfirm(id);
        }
      }
    });
    setSelectedNodeIds([]);
    selectedNodeIdsRef.current = [];
  }, [handleDeleteTodoConfirm, openPermanentDeleteModal]);

  const deleteNode = useCallback((e, id) => {
    if (e) e.stopPropagation();
    const targetNode = nodesRef.current.find(n => n.id === id);
    if (!targetNode || targetNode.isRoot) return;
    if (targetNode.isDeleted) {
      openPermanentDeleteModal({ id: targetNode.id, itemType: 'todo', text: targetNode.text });
      return;
    }
    handleDeleteTodoConfirm(id);
    setSelectedNodeIds(prev => prev.filter(selectedId => selectedId !== id));
    selectedNodeIdsRef.current = selectedNodeIdsRef.current.filter(selectedId => selectedId !== id);
  }, [handleDeleteTodoConfirm, openPermanentDeleteModal]);

  const handleDeleteNode = useCallback((e, id, isSelected) => {
    if (e) e.stopPropagation();
    if (isSelected && selectedNodeIdsRef.current.length > 1) {
      deleteSelectedNodes();
    } else {
      deleteNode(e, id);
    }
  }, [deleteSelectedNodes, deleteNode]);

  const deleteConnection = useCallback((id) => {
    pushHistory();
    setConnections(prev => prev.filter(c => c.id !== id));
  }, [pushHistory]);

  const updateNodeText = useCallback((id, text) => {
    setNodes(prev => prev.map(n => {
      if (n.id === id) {
        if (n.isRoot) {
          const baseWidth = 120;
          const maxWidth = 240;
          const charWidth = 8;
          const estimatedTextWidth = (text || '').length * charWidth;
          const circleWidth = Math.min(maxWidth, Math.max(baseWidth, estimatedTextWidth + 40));
          const innerWidth = maxWidth - 40;
          const estimatedLines = Math.max(1, Math.ceil(estimatedTextWidth / innerWidth));
          const circleHeight = Math.max(120, estimatedLines * 24 + 60);
          return {
            ...n,
            text,
            width: Math.max(n.width || 120, circleWidth),
            height: Math.max(n.height || 120, circleHeight)
          };
        }
        return { ...n, text };
      }
      return n;
    }));
    setTodos(prev => prev.map(t => t.id === id ? { ...t, text } : t));
  }, []);

  const handleTextFocus = useCallback((node, text) => {
    textBeforeEditRef.current = { id: node.id, text };
  }, []);

  const handleTextBlur = useCallback((node, text) => {
    if (textBeforeEditRef.current && textBeforeEditRef.current.id === node.id && textBeforeEditRef.current.text !== text) {
      const prevNodes = nodesRef.current.map(n => n.id === node.id ? { ...n, text: textBeforeEditRef.current.text } : { ...n });
      pushHistory(prevNodes, connectionsRef.current);
      textBeforeEditRef.current = null;
    }
  }, [pushHistory]);

  const generateFlowFromFileTree = useCallback((content) => {
    const lines = content.split('\n');
    const newNodes = [];
    const newConnections = [];
    const parentStack = [];

    const currentNodes = nodesRef.current;
    let currentY = currentNodes.length > 0 ? Math.max(...currentNodes.map(n => n.y + (n.height || 96))) + 100 : 0;
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
  }, [pushHistory]);

  const handleFileUpload = useCallback((event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target.result;
      generateFlowFromFileTree(content);
    };
    reader.readAsText(file);
    event.target.value = null;
  }, [generateFlowFromFileTree]);

  const isAnyModalOpen = isNoteModalOpen || isDeleteModalOpen || isTodoModalOpen || isDeleteTodoModalOpen || isPermanentDeleteModalOpen || isEmptyTrashModalOpen || !!previewTrashItem;
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

  const handleCopy = useCallback(() => {
    const selectedIds = selectedNodeIdsRef.current;
    if (!selectedIds || selectedIds.length === 0) return;

    const selectedSet = new Set(selectedIds);
    const nodesToCopy = nodesRef.current.filter(n => selectedSet.has(n.id));
    if (nodesToCopy.length === 0) return;

    const connectionsToCopy = connectionsRef.current.filter(
      c => selectedSet.has(c.from) && selectedSet.has(c.to)
    );

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (let i = 0; i < nodesToCopy.length; i++) {
      const n = nodesToCopy[i];
      const w = n.width || 96;
      const h = n.height || 96;
      if (n.x < minX) minX = n.x;
      if (n.y < minY) minY = n.y;
      if (n.x + w > maxX) maxX = n.x + w;
      if (n.y + h > maxY) maxY = n.y + h;
    }

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const clipData = {
      nodes: nodesToCopy.map(n => ({ ...n })),
      connections: connectionsToCopy.map(c => ({ ...c })),
      bounds: {
        minX,
        minY,
        maxX,
        maxY,
        centerX,
        centerY,
        width: maxX - minX,
        height: maxY - minY
      }
    };

    clipboardRef.current = clipData;
    try {
      localStorage.setItem('flowtasks_clipboard', JSON.stringify(clipData));
    } catch {
      // ignore
    }

    pasteCountRef.current = 0;
    lastPastePosRef.current = null;

    const shapesCount = nodesToCopy.length;
    const connsCount = connectionsToCopy.length;
    let toastText = `Copied ${shapesCount} shape${shapesCount > 1 ? 's' : ''}`;
    if (connsCount > 0) {
      toastText += ` & ${connsCount} connector${connsCount > 1 ? 's' : ''}`;
    }
    showToast(toastText);
  }, [showToast]);

  const handlePaste = useCallback(() => {
    let clipData = clipboardRef.current;
    if (!clipData) {
      try {
        const saved = localStorage.getItem('flowtasks_clipboard');
        if (saved) clipData = JSON.parse(saved);
      } catch {
        // ignore
      }
    }

    if (!clipData || !clipData.nodes || clipData.nodes.length === 0) {
      showToast('Clipboard is empty');
      return;
    }

    const canvasEl = canvasRef.current;
    let deltaX = 0;
    let deltaY = 0;

    const mousePos = mousePosRef.current;
    const isOverCanvas = isMouseOverCanvasRef.current;
    const bounds = clipData.bounds;

    if (isOverCanvas && mousePos && bounds) {
      const distFromOriginal = Math.hypot(
        mousePos.x - bounds.centerX,
        mousePos.y - bounds.centerY
      );

      // If user moved their mouse to another area of the canvas (> 40px away from original group center)
      if (distFromOriginal > 40) {
        const lastPos = lastPastePosRef.current;
        const isSameMousePos = lastPos && Math.hypot(mousePos.x - lastPos.x, mousePos.y - lastPos.y) < 15;
        
        if (isSameMousePos) {
          pasteCountRef.current += 1;
        } else {
          pasteCountRef.current = 0;
          lastPastePosRef.current = { x: mousePos.x, y: mousePos.y };
        }

        deltaX = (mousePos.x - bounds.centerX) + pasteCountRef.current * 30;
        deltaY = (mousePos.y - bounds.centerY) + pasteCountRef.current * 30;
      } else {
        // Mouse is still hovering around the original position
        pasteCountRef.current += 1;
        deltaX = pasteCountRef.current * 40;
        deltaY = pasteCountRef.current * 40;
      }
    } else if (canvasEl && bounds) {
      // Mouse is outside canvas - paste centered in current canvas view
      const viewCenterX = (canvasEl.clientWidth / 2 - panRef.current.x) / zoomRef.current;
      const viewCenterY = (canvasEl.clientHeight / 2 - panRef.current.y) / zoomRef.current;
      pasteCountRef.current += 1;
      deltaX = (viewCenterX - bounds.centerX) + (pasteCountRef.current - 1) * 30;
      deltaY = (viewCenterY - bounds.centerY) + (pasteCountRef.current - 1) * 30;
    } else {
      pasteCountRef.current += 1;
      deltaX = pasteCountRef.current * 40;
      deltaY = pasteCountRef.current * 40;
    }

    const idMap = new Map();
    const newNodes = clipData.nodes.map(node => {
      const newId = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      idMap.set(node.id, newId);
      return {
        ...node,
        id: newId,
        x: Math.round(node.x + deltaX),
        y: Math.round(node.y + deltaY)
      };
    });

    const newConnections = (clipData.connections || [])
      .filter(c => idMap.has(c.from) && idMap.has(c.to))
      .map(c => ({
        ...c,
        id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
        from: idMap.get(c.from),
        to: idMap.get(c.to)
      }));

    pushHistory();
    setNodes(prev => [...prev, ...newNodes]);
    setConnections(prev => [...prev, ...newConnections]);

    const newSelectedIds = newNodes.map(n => n.id);
    setSelectedNodeIds(newSelectedIds);
    selectedNodeIdsRef.current = newSelectedIds;

    const shapesCount = newNodes.length;
    const connsCount = newConnections.length;
    let toastText = `Pasted ${shapesCount} shape${shapesCount > 1 ? 's' : ''}`;
    if (connsCount > 0) {
      toastText += ` with ${connsCount} connector${connsCount > 1 ? 's' : ''}`;
    }
    showToast(toastText);
  }, [pushHistory, showToast]);

  const handleCopyRef = useRef(handleCopy);
  useEffect(() => {
    handleCopyRef.current = handleCopy;
  }, [handleCopy]);

  const handlePasteRef = useRef(handlePaste);
  useEffect(() => {
    handlePasteRef.current = handlePaste;
  }, [handlePaste]);

  // Keyboard events for Spacebar panning, Delete/Backspace, Copy/Paste, and Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
        isSpacePressedRef.current = true;
        e.preventDefault();
        return;
      }

      if (isAnyModalOpenRef.current) return;
      const isEditingText = e.target.tagName === 'INPUT' || 
                            e.target.tagName === 'TEXTAREA' || 
                            e.target.isContentEditable ||
                            document.activeElement?.tagName === 'INPUT' ||
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            document.activeElement?.isContentEditable;
      if (isEditingText) return;

      // Delete or Backspace key to delete selected shapes
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedNodeIdsRef.current.length > 0) {
          e.preventDefault();
          deleteSelectedNodesRef.current();
        }
        return;
      }

      // Copy: Ctrl+C or Cmd+C
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        if (selectedNodeIdsRef.current.length > 0) {
          e.preventDefault();
          handleCopyRef.current();
          return;
        }
      }

      // Paste: Ctrl+V or Cmd+V
      if ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault();
        handlePasteRef.current();
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
        isSpacePressedRef.current = false;
        setIsPanning(false);
        isPanningRef.current = false;
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
        e.preventDefault();
        setZoom((prevZoom) => {
          const zoomFactor = Math.exp(-e.deltaY * 0.0005);
          const newZoom = prevZoom * zoomFactor;
          return Math.min(Math.max(0.1, newZoom), 3);
        });
      }
    };
    canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvasEl.removeEventListener('wheel', handleWheel);
  }, []);

  // Drag and Drop from navbar
  const onDragStartNavbar = useCallback((e, shapeType) => {
    e.dataTransfer.setData('shapeType', shapeType);
  }, []);

  const onDragOverCanvas = useCallback((e) => {
    e.preventDefault();
  }, []);

  const onDropCanvas = useCallback((e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('shapeType');
    if (!type) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const localX = (mouseX - panRef.current.x) / zoomRef.current;
    const localY = (mouseY - panRef.current.y) / zoomRef.current;

    const newId = Date.now().toString();
    const defaultNodeType = type === 'Circle' ? 'flow' : 'task';

    const newNode = {
      id: newId,
      type,
      nodeType: defaultNodeType,
      x: localX - 48,
      y: localY - 48,
      text: '',
      width: 96,
      height: 96
    };

    const newTodo = {
      id: newId,
      text: '',
      nodeType: defaultNodeType,
      shape: type,
      completed: false,
      date: new Date().toLocaleDateString()
    };

    pushHistory();
    setNodes(prev => [...prev, newNode]);
    setTodos(prev => [newTodo, ...prev]);
    setActiveSidebarTab('todos');
  }, [pushHistory]);

  // Node Resizing
  const startResizeNode = useCallback((e, node) => {
    if (isSpacePressedRef.current) return;
    e.stopPropagation();
    if (drawingConnectionRef.current) return;
    
    dragInitialStateRef.current = {
      nodes: nodesRef.current.map(n => ({ ...n })),
      connections: connectionsRef.current.map(c => ({ ...c }))
    };

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - panRef.current.x) / zoomRef.current;
    const localY = (mouseY - panRef.current.y) / zoomRef.current;
    
    const nextResizing = {
      id: node.id,
      startX: localX,
      startY: localY,
      startWidth: node.width || 96,
      startHeight: node.height || 96
    };
    resizingNodeRef.current = nextResizing;
    setResizingNode(nextResizing);
  }, []);

  // Node Dragging
  const startDragNode = useCallback((e, node) => {
    if (isSpacePressedRef.current) return;
    e.stopPropagation();
    if (drawingConnectionRef.current || resizingNodeRef.current) return;

    dragInitialStateRef.current = {
      nodes: nodesRef.current.map(n => ({ ...n })),
      connections: connectionsRef.current.map(c => ({ ...c }))
    };

    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - panRef.current.x) / zoomRef.current;
    const localY = (mouseY - panRef.current.y) / zoomRef.current;
    
    const selectedIds = selectedNodeIdsRef.current;
    const currentNodes = nodesRef.current;

    if (e.shiftKey) {
      const isSelected = selectedIds.includes(node.id);
      const nextSelected = isSelected 
        ? selectedIds.filter(id => id !== node.id)
        : [...selectedIds, node.id];
      setSelectedNodeIds(nextSelected);
      selectedNodeIdsRef.current = nextSelected;
      if (isSelected) return;
      const initialNodes = currentNodes.filter(n => nextSelected.includes(n.id));
      const initialNodesMap = new Map(initialNodes.map(n => [n.id, n]));
      const nextDrag = {
        isGroup: true,
        startX: localX,
        startY: localY,
        initialNodes,
        initialNodesMap
      };
      draggingNodeRef.current = nextDrag;
      setDraggingNode(nextDrag);
      return;
    }

    if (selectedIds.includes(node.id)) {
      const initialNodes = currentNodes.filter(n => selectedIds.includes(n.id));
      const initialNodesMap = new Map(initialNodes.map(n => [n.id, n]));
      const nextDrag = {
        isGroup: true,
        startX: localX,
        startY: localY,
        initialNodes,
        initialNodesMap
      };
      draggingNodeRef.current = nextDrag;
      setDraggingNode(nextDrag);
    } else {
      setSelectedNodeIds([node.id]);
      selectedNodeIdsRef.current = [node.id];
      const nextDrag = {
        isGroup: false,
        id: node.id,
        offsetX: localX - node.x,
        offsetY: localY - node.y
      };
      draggingNodeRef.current = nextDrag;
      setDraggingNode(nextDrag);
    }
  }, []);

  // Connection Drawing
  const startConnection = useCallback((e, node, handlePos) => {
    if (isSpacePressedRef.current) return;
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
    
    const localX = (mouseX - panRef.current.x) / zoomRef.current;
    const localY = (mouseY - panRef.current.y) / zoomRef.current;
    
    const nextDrawing = {
      fromId: node.id,
      fromHandle: handlePos,
      startX,
      startY,
      currentX: localX,
      currentY: localY
    };
    drawingConnectionRef.current = nextDrawing;
    setDrawingConnection(nextDrawing);
  }, []);

  const handleCanvasMouseDown = useCallback((e) => {
    if (isSpacePressedRef.current) {
      isPanningRef.current = true;
      setIsPanning(true);
      e.preventDefault();
    } else {
      const rect = canvasRef.current.getBoundingClientRect();
      const localX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const localY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;
      const initialBox = { startX: localX, startY: localY, endX: localX, endY: localY };
      selectionBoxRef.current = initialBox;
      setSelectionBox(initialBox);
      selectedNodeIdsRef.current = [];
      setSelectedNodeIds([]);
    }
  }, []);

  // requestAnimationFrame batching for smooth, zero-stutter mouse moves
  const rafIdRef = useRef(null);
  const latestMoveEventRef = useRef(null);

  const processMouseMove = useCallback((evtData) => {
    if (evtData.isPanning) {
      setPan(prev => ({ x: prev.x + evtData.movementX, y: prev.y + evtData.movementY }));
      return;
    }

    const canvasEl = canvasRef.current;
    if (!canvasEl) return;
    const rect = canvasEl.getBoundingClientRect();
    const mouseX = evtData.clientX - rect.left;
    const mouseY = evtData.clientY - rect.top;
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const localX = (mouseX - currentPan.x) / currentZoom;
    const localY = (mouseY - currentPan.y) / currentZoom;

    const currentSelectionBox = selectionBoxRef.current;
    if (currentSelectionBox) {
      const nextBox = { ...currentSelectionBox, endX: localX, endY: localY };
      selectionBoxRef.current = nextBox;
      setSelectionBox(nextBox);
      const minX = Math.min(nextBox.startX, localX);
      const maxX = Math.max(nextBox.startX, localX);
      const minY = Math.min(nextBox.startY, localY);
      const maxY = Math.max(nextBox.startY, localY);
      
      const currentNodes = nodesRef.current;
      const newlySelected = [];
      for (let i = 0; i < currentNodes.length; i++) {
        const node = currentNodes[i];
        const w = node.width || 96;
        const h = node.height || 96;
        const nodeCenterX = node.x + w / 2;
        const nodeCenterY = node.y + h / 2;
        if (nodeCenterX >= minX && nodeCenterX <= maxX && nodeCenterY >= minY && nodeCenterY <= maxY) {
          newlySelected.push(node.id);
        }
      }
      
      const prevSelected = selectedNodeIdsRef.current;
      const isSame = prevSelected.length === newlySelected.length && 
        newlySelected.every(id => prevSelected.includes(id));
      if (!isSame) {
        selectedNodeIdsRef.current = newlySelected;
        setSelectedNodeIds(newlySelected);
      }
      return;
    }

    const dragging = draggingNodeRef.current;
    if (dragging) {
      if (dragging.isGroup) {
        const deltaX = localX - dragging.startX;
        const deltaY = localY - dragging.startY;
        const initMap = dragging.initialNodesMap;
        setNodes(prev => prev.map(n => {
          const initial = initMap.get(n.id);
          if (initial) {
            return { ...n, x: initial.x + deltaX, y: initial.y + deltaY };
          }
          return n;
        }));
      } else {
        const x = localX - dragging.offsetX;
        const y = localY - dragging.offsetY;
        setNodes(prev => prev.map(n => n.id === dragging.id ? { ...n, x, y } : n));
      }
      return;
    }

    const resizing = resizingNodeRef.current;
    if (resizing) {
      const deltaX = localX - resizing.startX;
      const deltaY = localY - resizing.startY;
      const newWidth = Math.max(48, resizing.startWidth + deltaX);
      const newHeight = Math.max(48, resizing.startHeight + deltaY);
      setNodes(prev => prev.map(n => n.id === resizing.id ? { ...n, width: newWidth, height: newHeight } : n));
      return;
    }

    const drawing = drawingConnectionRef.current;
    if (drawing) {
      const nextDrawing = {
        ...drawing,
        currentX: localX,
        currentY: localY
      };
      drawingConnectionRef.current = nextDrawing;
      setDrawingConnection(nextDrawing);
    }
  }, []);

  const handleCanvasMouseMove = useCallback((e) => {
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const localX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const localY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;
      mousePosRef.current = { x: localX, y: localY };
      isMouseOverCanvasRef.current = true;
    }

    if (isPanningRef.current) {
      if (latestMoveEventRef.current && latestMoveEventRef.current.isPanning) {
        latestMoveEventRef.current.movementX += e.movementX;
        latestMoveEventRef.current.movementY += e.movementY;
        latestMoveEventRef.current.clientX = e.clientX;
        latestMoveEventRef.current.clientY = e.clientY;
      } else {
        latestMoveEventRef.current = {
          clientX: e.clientX,
          clientY: e.clientY,
          movementX: e.movementX,
          movementY: e.movementY,
          isPanning: true
        };
      }
    } else {
      if (!selectionBoxRef.current && !draggingNodeRef.current && !resizingNodeRef.current && !drawingConnectionRef.current) {
        return;
      }
      latestMoveEventRef.current = {
        clientX: e.clientX,
        clientY: e.clientY,
        movementX: e.movementX,
        movementY: e.movementY,
        isPanning: false
      };
    }

    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(() => {
        rafIdRef.current = null;
        if (latestMoveEventRef.current) {
          processMouseMove(latestMoveEventRef.current);
          latestMoveEventRef.current = null;
        }
      });
    }
  }, [processMouseMove]);

  const handleCanvasMouseUp = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (latestMoveEventRef.current) {
      processMouseMove(latestMoveEventRef.current);
      latestMoveEventRef.current = null;
    }

    if (isPanningRef.current) {
      setIsPanning(false);
      isPanningRef.current = false;
    }

    if (draggingNodeRef.current) {
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
      draggingNodeRef.current = null;
    }

    if (drawingConnectionRef.current) {
      setDrawingConnection(null);
      drawingConnectionRef.current = null;
    }

    if (selectionBoxRef.current) {
      setSelectionBox(null);
      selectionBoxRef.current = null;
    }

    if (resizingNodeRef.current) {
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
      resizingNodeRef.current = null;
    }
  }, [processMouseMove, pushHistory]);

  const handleCanvasMouseEnter = useCallback((e) => {
    isMouseOverCanvasRef.current = true;
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      const rect = canvasEl.getBoundingClientRect();
      const localX = (e.clientX - rect.left - panRef.current.x) / zoomRef.current;
      const localY = (e.clientY - rect.top - panRef.current.y) / zoomRef.current;
      mousePosRef.current = { x: localX, y: localY };
    }
  }, []);

  const handleCanvasMouseLeave = useCallback(() => {
    isMouseOverCanvasRef.current = false;
    handleCanvasMouseUp();
  }, [handleCanvasMouseUp]);

  const handleNodeMouseUp = useCallback((e, targetNode) => {
    const drawing = drawingConnectionRef.current;
    if (drawing && drawing.fromId !== targetNode.id) {
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
      setConnections(prev => [
        ...prev, 
        { 
          id: Date.now().toString(), 
          from: drawing.fromId, 
          fromHandle: drawing.fromHandle,
          to: targetNode.id,
          toHandle
        }
      ]);
      setDrawingConnection(null);
      drawingConnectionRef.current = null;
    }
  }, [pushHistory]);

  // Memoized multi-selection bounding box computation (O(N) single pass)
  const selectionBounds = useMemo(() => {
    if (selectedNodeIds.length <= 1) return null;
    const selectedSet = selectedNodeIdsSet;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let count = 0;
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (selectedSet.has(n.id)) {
        count++;
        const w = n.width || 96;
        const h = n.height || 96;
        if (n.x < minX) minX = n.x;
        if (n.y < minY) minY = n.y;
        if (n.x + w > maxX) maxX = n.x + w;
        if (n.y + h > maxY) maxY = n.y + h;
      }
    }
    if (count <= 1 || minX === Infinity) return null;
    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
      count
    };
  }, [nodes, selectedNodeIds.length, selectedNodeIdsSet]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-300 font-sans w-full overflow-hidden text-left relative">
      {/* Sidebar Navigation */}
      <div className="w-16 bg-slate-800 border-r border-slate-700 flex flex-col items-center py-4 z-20">
        <button onClick={onBack} className="p-3 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl mb-6 transition-colors" title="Back to Projects">
          <ArrowLeft size={20} />
        </button>
        <div className="flex flex-col gap-2 w-full px-2">
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'todos' ? null : 'todos')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'todos' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Tasks & Flows (To-Do List)">
            <CheckSquare size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'layouts' ? null : 'layouts')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'layouts' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Layouts">
            <Layout size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'notes' ? null : 'notes')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'notes' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Notes">
            <FileText size={20} />
          </button>
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'import' ? null : 'import')} className={`p-3 w-full flex justify-center rounded-xl transition-colors ${activeSidebarTab === 'import' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Import File Tree">
            <Upload size={20} />
          </button>
          <div className="w-8 h-px bg-slate-700/60 my-1 self-center" />
          <button onClick={() => setActiveSidebarTab(activeSidebarTab === 'trash' ? null : 'trash')} className={`p-3 w-full flex justify-center rounded-xl transition-colors relative ${activeSidebarTab === 'trash' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`} title="Trash Bin">
            <Trash2 size={20} />
            {trash.length > 0 && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
            )}
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
            <h2 className="text-lg font-bold text-white capitalize">
              {activeSidebarTab === 'trash' ? 'Trash Bin' : activeSidebarTab === 'todos' ? 'Tasks & Flows' : activeSidebarTab || ''}
            </h2>
            {activeSidebarTab === 'notes' && (
              <button onClick={handleCreateNote} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" title="Create Note">
                <Plus size={18} />
              </button>
            )}
            {activeSidebarTab === 'todos' && (
              <div className="flex items-center gap-1.5">
                {allParentIds.size > 0 && (
                  <button 
                    type="button"
                    onClick={handleToggleExpandAll} 
                    className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 transition-colors flex items-center gap-1 border border-slate-700/60 font-medium"
                    title={allExpanded ? "Collapse all containers" : "Expand all containers"}
                  >
                    <ChevronsUpDown size={13} />
                    {allExpanded ? 'Collapse' : 'Expand'}
                  </button>
                )}
                <button onClick={handleCreateTodo} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" title="Create Task / Flow">
                  <Plus size={18} />
                </button>
              </div>
            )}
            {activeSidebarTab === 'trash' && trash.length > 0 && (
              <button 
                onClick={() => setIsEmptyTrashModalOpen(true)} 
                className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-1 rounded transition-colors font-medium flex items-center gap-1 border border-red-500/20" 
                title="Empty Trash Bin"
              >
                <Trash2 size={13} />
                Empty Trash
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto overscroll-y-contain p-4 pr-2.5 sidebar-scrollbar">
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
                  <div className="space-y-3">
                    {todoTreeData.topLevelTodos.map(topTodo => {
                      const childTodos = todoTreeData.childrenByParent.get(topTodo.id) || [];
                      return (
                        <NestedTodoItem
                          key={topTodo.id}
                          todo={topTodo}
                          childTodos={childTodos}
                          childrenByParent={todoTreeData.childrenByParent}
                          expandedNodeIds={expandedNodeIds}
                          onToggleExpand={handleToggleExpand}
                          onToggleCompletion={toggleTodoCompletion}
                          onEdit={handleEditTodo}
                          onDelete={openDeleteTodoModal}
                          onSwitchType={handleSwitchTodoType}
                          onCreateSubTodo={handleCreateSubTodo}
                          depth={0}
                          visitedPath={new Set([topTodo.id])}
                        />
                      );
                    })}
                  </div>
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
            {activeSidebarTab === 'trash' && (
              <div className="space-y-4">
                {trash.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <Trash2 size={40} className="mx-auto mb-4 opacity-50" />
                    <p className="font-medium text-slate-400">Trash is empty</p>
                    <p className="text-xs text-slate-500 mt-1">Deleted notes and tasks will appear here.</p>
                  </div>
                ) : (
                  <div>
                    {/* Filter pills: All, Notes, Tasks */}
                    <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg mb-3 border border-slate-700 text-xs">
                      <button
                        type="button"
                        onClick={() => setTrashFilter('all')}
                        className={`flex-1 py-1 px-2 rounded-md transition-colors font-medium ${
                          trashFilter === 'all' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        All ({trash.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrashFilter('notes')}
                        className={`flex-1 py-1 px-2 rounded-md transition-colors font-medium ${
                          trashFilter === 'notes' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Notes ({trash.filter(t => t.itemType === 'note').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTrashFilter('todos')}
                        className={`flex-1 py-1 px-2 rounded-md transition-colors font-medium ${
                          trashFilter === 'todos' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-slate-300'
                        }`}
                      >
                        Tasks ({trash.filter(t => t.itemType === 'todo').length})
                      </button>
                    </div>

                    {/* List of trash items */}
                    <div className="space-y-3">
                      {trash
                        .filter(item => {
                          if (trashFilter === 'notes') return item.itemType === 'note';
                          if (trashFilter === 'todos') return item.itemType === 'todo';
                          return true;
                        })
                        .map((item, idx) => {
                          const isNote = item.itemType === 'note';
                          return (
                            <div
                              key={`${item.itemType}-${item.id}-${idx}`}
                              onClick={() => setPreviewTrashItem(item)}
                              className="bg-slate-900/80 rounded-xl border border-slate-700/80 p-3.5 hover:border-slate-500 transition-colors cursor-pointer group/trashitem relative overflow-hidden"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  isNote ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                }`}>
                                  {isNote ? <FileText size={11} /> : <CheckSquare size={11} />}
                                  {isNote ? 'Note' : 'Task'}
                                </span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/trashitem:opacity-100 transition-opacity">
                                  <button
                                    type="button"
                                    onClick={(e) => handleRestoreItem(item, e)}
                                    className="p-1 rounded text-emerald-400 hover:text-emerald-300 hover:bg-slate-800 transition-colors"
                                    title="Restore item"
                                  >
                                    <RefreshCcw size={14} />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => openPermanentDeleteModal(item, e)}
                                    className="p-1 rounded text-red-400 hover:text-red-300 hover:bg-slate-800 transition-colors"
                                    title="Delete permanently"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              </div>

                              {isNote ? (
                                <div>
                                  <h4 className="font-medium text-white text-sm truncate mb-1 line-through opacity-80 group-hover/trashitem:opacity-100">
                                    {item.title || 'Untitled Note'}
                                  </h4>
                                  <p className="text-xs text-slate-400 line-clamp-2 mb-2 whitespace-pre-wrap">
                                    {item.content || 'Empty note...'}
                                  </p>
                                </div>
                              ) : (
                                <div>
                                  <p className="text-xs text-slate-300 line-through opacity-80 group-hover/trashitem:opacity-100 line-clamp-2 mb-2 whitespace-pre-wrap">
                                    {item.text || 'Empty task...'}
                                  </p>
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-800/80">
                                <span>Deleted {item.deletedAt || item.date}</span>
                                <span className="text-slate-600 group-hover/trashitem:text-blue-400 transition-colors">Click to view</span>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-900 relative overflow-hidden">
        {/* Floating Toast Notification */}
        {toastMessage && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-800/95 border border-slate-700 text-slate-200 px-4 py-1.5 rounded-full text-xs font-semibold shadow-2xl z-50 pointer-events-none flex items-center gap-2 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {toastMessage}
          </div>
        )}

        {/* Canvas header */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 pointer-events-none z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${project.color} opacity-80`} />
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
          </div>
          <div className="ml-auto pointer-events-auto flex items-center gap-2">
            {/* Undo / Redo & Copy / Paste Controls */}
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
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button 
                type="button"
                onClick={handleCopy}
                disabled={selectedNodeIds.length === 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 disabled:cursor-not-allowed rounded-full hover:bg-slate-700 transition-colors"
                title="Copy (Ctrl+C)"
              >
                <Copy size={16} />
              </button>
              <button 
                type="button"
                onClick={handlePaste}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                title="Paste (Ctrl+V)"
              >
                <ClipboardPaste size={16} />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button 
                type="button"
                onClick={() => {
                  const aligned = autoAlignWorkflow(nodesRef.current, connectionsRef.current);
                  pushHistory();
                  setNodes(aligned.nodes);
                  setConnections(aligned.connections);
                  showToast('Workflow auto-aligned');
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-slate-700 transition-colors"
                title="Auto Align Workflow"
              >
                <Sparkles size={16} />
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
          onMouseEnter={handleCanvasMouseEnter}
          onMouseLeave={handleCanvasMouseLeave}
        >
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center text-slate-600">
                <div className="w-64 h-64 border-2 border-dashed border-slate-700 rounded-2xl flex items-center justify-center mb-4 mx-auto">
                  Canvas Area
                </div>
                <p>Drag shapes from the bottom bar to build your flow.</p>
                <p className="text-sm mt-2">Space + Drag to pan. Ctrl + Scroll to zoom. Ctrl+C / Ctrl+V to copy/paste. Delete to remove. Ctrl+Z / Ctrl+Y to undo/redo.</p>
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
                const fromNode = nodesMap.get(conn.from);
                const toNode = nodesMap.get(conn.to);
                return (
                  <CanvasConnection
                    key={conn.id}
                    conn={conn}
                    fromNode={fromNode}
                    toNode={toNode}
                    onDelete={deleteConnection}
                  />
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
            <SelectionBox box={selectionBox} />

            {/* Multi-selection Bounding Box & Group Delete / Copy */}
            {!drawingConnection && (
              <SelectionBounds 
                bounds={selectionBounds} 
                onDelete={deleteSelectedNodes} 
                onCopy={handleCopy}
              />
            )}

            {/* Render Nodes */}
            {nodes.map(node => {
              const matchedTodo = todosMap.get(node.id);
              const isCompleted = Boolean(node.isCompleted ?? matchedTodo?.completed);
              return (
                <CanvasNode
                  key={node.id}
                  node={{ ...node, isCompleted }}
                  isSelected={selectedNodeIdsSet.has(node.id)}
                  isSpacePressed={isSpacePressed}
                  onStartDrag={startDragNode}
                  onStartResize={startResizeNode}
                  onStartConnection={startConnection}
                  onMouseUp={handleNodeMouseUp}
                  onDelete={handleDeleteNode}
                  onRestore={(e) => handleRestoreItem({ id: node.id, itemType: 'todo', text: node.text, nodeType: node.nodeType, shape: node.type }, e)}
                  onTextChange={updateNodeText}
                  onTextFocus={handleTextFocus}
                  onTextBlur={handleTextBlur}
                />
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

      {/* Modal Animations & Custom Styles */}
      <style>{`
        /* Sidebar Scrollbar */
        .sidebar-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: rgba(100, 116, 139, 0.4) transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .sidebar-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(100, 116, 139, 0.35);
          border-radius: 9999px;
          transition: background-color 0.2s ease;
        }
        .sidebar-scrollbar:hover::-webkit-scrollbar-thumb {
          background-color: rgba(100, 116, 139, 0.6);
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.85);
        }
        .sidebar-scrollbar::-webkit-scrollbar-thumb:active {
          background-color: rgba(203, 213, 225, 1);
        }
        .sidebar-scrollbar::-webkit-scrollbar-corner {
          background: transparent;
        }

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
            <div className="flex justify-between gap-3">
              {editingNoteId && (
                <button 
                  type="button"
                  onClick={(e) => { openDeleteModal(editingNoteId, e); }} 
                  className="px-4 py-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center gap-2"
                >
                  <Trash2 size={18} /> Delete
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button onClick={handleCancelEdit} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
                <button onClick={handleSaveNote} className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-2 font-medium"><Save size={18} /> Save Note</button>
              </div>
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
            <h3 className="text-lg font-bold text-white mb-2">Move Note to Trash</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to move this note to the trash bin? You can restore it anytime from the sidebar.</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={() => handleDeleteNoteConfirm(noteToDelete)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium flex items-center gap-1.5">
                <Trash2 size={16} /> Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Todo Modal */}
      {(isTodoModalOpen || isTodoModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          style={{ animation: isTodoModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-2xl border border-slate-700 p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto sidebar-scrollbar"
            style={{ animation: isTodoModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                {todoNodeType === 'flow' ? <GitBranch size={22} className="text-white" /> : <CheckSquare size={22} className="text-blue-400" />}
                {editingTodoId ? 'Edit Item' : 'New Task / Flow'}
              </h3>
              <button 
                type="button"
                onClick={handleCancelEditTodo}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Task / Flow text input */}
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                {todoNodeType === 'flow' ? 'Flow Name / Description' : 'Task Details'}
              </label>
              <textarea 
                value={todoInput} 
                onChange={(e) => setTodoInput(e.target.value)} 
                className="w-full bg-slate-900 text-slate-200 px-4 py-3 rounded-xl min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 border border-slate-700 text-base" 
                placeholder={todoNodeType === 'flow' ? 'e.g. Flow 1, Morning Production, Marketing Funnel...' : 'e.g. October 19 Hayat Clinic Social Media Content Creator\nGraphic Design Morning - 8:30PM PH base (oct 19)[Done]'} 
                autoFocus
              />
            </div>

            {/* Flow vs Task Selection */}
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Item Classification
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setTodoNodeType('flow');
                    if (todoShape === 'Square') setTodoShape('Circle');
                  }}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                    todoNodeType === 'flow' 
                      ? 'border-white bg-white/10 text-white shadow-lg shadow-white/5' 
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${todoNodeType === 'flow' ? 'bg-white text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                    <GitBranch size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Flow</div>
                    <div className="text-xs text-slate-400 opacity-80">Connector node (White border)</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTodoNodeType('task');
                    if (todoShape === 'Circle') setTodoShape('Square');
                  }}
                  className={`p-3.5 rounded-xl border flex items-center gap-3 transition-all text-left ${
                    todoNodeType === 'task' 
                      ? 'border-blue-500 bg-blue-500/10 text-white shadow-lg shadow-blue-500/10' 
                      : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-300'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${todoNodeType === 'task' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                    <CheckSquare size={18} />
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Task</div>
                    <div className="text-xs text-slate-400 opacity-80">Actionable item with checkbox (Blue border)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Shape Selection */}
            <div className="mb-5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Canvas Shape
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { id: 'Square', label: 'Square', icon: Square },
                  { id: 'Circle', label: 'Circle', icon: Circle },
                  { id: 'Triangle', label: 'Triangle', icon: Triangle },
                  { id: 'Hexagon', label: 'Hexagon', icon: Hexagon },
                  { id: 'Text', label: 'Text Only', icon: Type }
                ].map((s) => {
                  const Icon = s.icon;
                  const isSelected = todoShape === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setTodoShape(s.id)}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-500/15 text-blue-400 shadow-md' 
                          : 'border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-600 hover:text-slate-200'
                      }`}
                    >
                      <Icon size={20} />
                      <span className="text-xs font-medium">{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Connect To Node Selection with Directional Flow Navigation */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                  <Link2 size={14} className="text-slate-400" />
                  Connect To Node (Parent)
                </label>
                {parentOfCurrentNav && currentNavNode?.id !== rootModalNode?.id && (
                  <button
                    type="button"
                    onClick={() => {
                      setNavParentId(parentOfCurrentNav.id);
                      setTodoConnectTo(parentOfCurrentNav.id);
                    }}
                    className="text-xs text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1 font-medium transition-colors"
                    title={`Go back to ${parentOfCurrentNav.isRoot ? 'Root Project' : (parentOfCurrentNav.text || parentOfCurrentNav.type)}`}
                  >
                    <ArrowLeft size={13} /> Back direction
                  </button>
                )}
              </div>

              {/* Breadcrumb path for easy direction awareness */}
              {navBreadcrumbs.length > 1 && (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2 overflow-x-auto py-1 scrollbar-none">
                  <span className="text-slate-500 font-medium text-[11px]">Level:</span>
                  {navBreadcrumbs.map((bNode, idx) => {
                    const isLast = idx === navBreadcrumbs.length - 1;
                    return (
                      <span key={bNode.id} className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setNavParentId(bNode.id);
                            setTodoConnectTo(bNode.id);
                          }}
                          className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                            isLast 
                              ? 'bg-blue-500/20 text-blue-300 font-semibold border border-blue-500/30' 
                              : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700'
                          }`}
                        >
                          {bNode.isRoot ? '☆ Root' : bNode.nodeType === 'flow' ? `◇ ${bNode.text ? (bNode.text.length > 18 ? bNode.text.slice(0, 18) + '...' : bNode.text) : 'Flow'}` : `□ ${bNode.text ? (bNode.text.length > 18 ? bNode.text.slice(0, 18) + '...' : bNode.text) : 'Task'}`}
                        </button>
                        {!isLast && <span className="text-slate-600 text-[10px]">➔</span>}
                      </span>
                    );
                  })}
                </div>
              )}
              
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 flex items-center justify-center">
                  {(() => {
                    const selected = activeModalNodesMap.get(todoConnectTo);
                    if (!selected) return <Unlink size={16} className="text-slate-500" />;
                    if (selected.isRoot) return <Star size={16} className="text-amber-400" />;
                    if (selected.nodeType === 'flow') return <GitBranch size={16} className="text-slate-300" />;
                    return <Square size={16} className="text-blue-400" />;
                  })()}
                </div>

                <select
                  value={todoConnectTo === '' ? '__DISCONNECTED__' : todoConnectTo}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__BACK__') {
                      if (parentOfCurrentNav) {
                        setNavParentId(parentOfCurrentNav.id);
                        setTodoConnectTo(parentOfCurrentNav.id);
                      }
                    } else if (val === '__DISCONNECTED__') {
                      setTodoConnectTo('');
                    } else {
                      setTodoConnectTo(val);
                      // Drill into the selected node to reveal its downstream flow/tasks
                      if (val !== currentNavNode?.id) {
                        setNavParentId(val);
                      }
                    }
                  }}
                  className="w-full bg-slate-900 text-white pl-10 pr-10 py-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm cursor-pointer appearance-none"
                >
                  {/* Back Direction Option */}
                  {parentOfCurrentNav && currentNavNode?.id !== rootModalNode?.id && (
                    <option value="__BACK__">
                      ⬅ Back direction to: {parentOfCurrentNav.isRoot ? '☆ [Root Project]' : parentOfCurrentNav.nodeType === 'flow' ? '◇ [Flow]' : '□ [Task]'} {parentOfCurrentNav.text ? (parentOfCurrentNav.text.length > 30 ? parentOfCurrentNav.text.slice(0, 30) + '...' : parentOfCurrentNav.text) : parentOfCurrentNav.type}
                    </option>
                  )}

                  {/* Connect directly to currentNavNode */}
                  {currentNavNode && (
                    <option value={currentNavNode.id}>
                      ✓ Connect to: {currentNavNode.isRoot ? '☆ [Root Project]' : currentNavNode.nodeType === 'flow' ? '◇ [Flow]' : '□ [Task]'} {currentNavNode.text ? (currentNavNode.text.length > 35 ? currentNavNode.text.slice(0, 35) + '...' : currentNavNode.text) : currentNavNode.type}
                    </option>
                  )}

                  {/* Disconnected Option */}
                  <option value="__DISCONNECTED__">
                    ○ Disconnected / Root Level
                  </option>

                  {/* Direct Downstream Nodes under this Flow/Node */}
                  {navChildren.map(c => {
                    const childSubItems = modalChildrenMap.get(c.id) || [];
                    const hasSubItems = childSubItems.length > 0 || c.nodeType === 'flow';
                    const cPrefix = c.nodeType === 'flow' ? '◇ [Flow]' : '□ [Task]';
                    const cLabel = c.text 
                      ? (c.text.length > 32 ? c.text.slice(0, 32) + '...' : c.text)
                      : `${c.type} (${c.id.slice(-4)})`;
                    const subLabel = hasSubItems ? ` (${childSubItems.length} items) ➔` : '';
                    return (
                      <option key={c.id} value={c.id}>
                        ↳ {cPrefix} {cLabel}{subLabel}
                      </option>
                    );
                  })}
                </select>

                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <ChevronDown size={16} />
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 mt-1.5">
                <span>
                  {currentNavNode ? `Viewing flow under "${currentNavNode.isRoot ? (project.name || 'Root') : (currentNavNode.text || currentNavNode.type)}"` : 'Viewing root level'}
                </span>
                {navChildren.length > 0 && (
                  <span className="text-slate-400 font-medium">
                    {navChildren.length} downstream {navChildren.length === 1 ? 'branch' : 'branches'}
                  </span>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-700 mt-auto">
              {editingTodoId ? (
                <button 
                  type="button"
                  onClick={(e) => { openDeleteTodoModal(editingTodoId, e); }} 
                  className="px-4 py-2.5 text-red-400 hover:text-white hover:bg-red-600 rounded-xl transition-colors font-medium flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} /> Delete
                </button>
              ) : <div />}
              <div className="flex gap-3">
                <button 
                  type="button"
                  onClick={handleCancelEditTodo} 
                  className="px-5 py-2.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-xl transition-colors font-medium text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={handleSaveTodo} 
                  className="px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-500 rounded-xl transition-colors flex items-center gap-2 font-medium text-sm shadow-lg shadow-blue-600/20"
                >
                  <Save size={16} /> {editingTodoId ? 'Save Changes' : 'Create & Connect'}
                </button>
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
            <h3 className="text-lg font-bold text-white mb-2">Move Task to Trash</h3>
            <p className="text-slate-400 mb-6">Are you sure you want to move this task to the trash bin? You can restore it anytime from the sidebar.</p>
            <div className="flex justify-end gap-3">
              <button onClick={closeDeleteTodoModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={() => handleDeleteTodoConfirm(todoToDelete)} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium flex items-center gap-1.5">
                <Trash2 size={16} /> Move to Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Confirmation Modal */}
      {(isPermanentDeleteModalOpen || isPermanentDeleteModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          style={{ animation: isPermanentDeleteModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl"
            style={{ animation: isPermanentDeleteModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">
              Permanently Delete {itemToPermanentDelete?.itemType === 'note' ? 'Note' : 'Task'}
            </h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to permanently delete this {itemToPermanentDelete?.itemType === 'note' ? 'note' : 'task'}? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={closePermanentDeleteModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handlePermanentDeleteConfirm} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium flex items-center gap-1.5">
                <X size={16} /> Delete Forever
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty Trash Confirmation Modal */}
      {(isEmptyTrashModalOpen || isEmptyTrashModalClosing) && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          style={{ animation: isEmptyTrashModalClosing ? 'fadeOut 0.2s ease-out forwards' : 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-sm shadow-2xl"
            style={{ animation: isEmptyTrashModalClosing ? 'scaleDown 0.2s ease-out forwards' : 'scaleUp 0.2s ease-out' }}
          >
            <h3 className="text-lg font-bold text-white mb-2">Empty Trash Bin</h3>
            <p className="text-slate-400 mb-6">
              Are you sure you want to permanently delete all {trash.length} {trash.length === 1 ? 'item' : 'items'} in the trash bin? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={closeEmptyTrashModal} className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium">Cancel</button>
              <button onClick={handleEmptyTrashConfirm} className="px-4 py-2 bg-red-600 text-white hover:bg-red-500 rounded-lg transition-colors font-medium flex items-center gap-1.5">
                <Trash2 size={16} /> Empty Trash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Trash Item Modal */}
      {previewTrashItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          style={{ animation: 'fadeIn 0.2s ease-out' }}
        >
          <div 
            className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh]"
            style={{ animation: 'scaleUp 0.2s ease-out' }}
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-700">
              <div className="flex items-center gap-2.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                  previewTrashItem.itemType === 'note' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {previewTrashItem.itemType === 'note' ? <FileText size={13} /> : <CheckSquare size={13} />}
                  {previewTrashItem.itemType === 'note' ? 'Deleted Note' : 'Deleted Task'}
                </span>
                <span className="text-xs text-slate-400">Deleted {previewTrashItem.deletedAt || previewTrashItem.date}</span>
              </div>
              <button 
                type="button"
                onClick={() => setPreviewTrashItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto mb-6 pr-1">
              {previewTrashItem.itemType === 'note' ? (
                <div>
                  <h3 className="text-xl font-bold text-white mb-3">
                    {previewTrashItem.title || 'Untitled Note'}
                  </h3>
                  <div className="bg-slate-900/90 rounded-lg p-4 border border-slate-700/60 text-slate-300 text-sm whitespace-pre-wrap leading-relaxed min-h-[120px]">
                    {previewTrashItem.content || <span className="italic text-slate-500">No content</span>}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="bg-slate-900/90 rounded-lg p-4 border border-slate-700/60 text-slate-300 text-base whitespace-pre-wrap leading-relaxed min-h-[100px] flex items-start gap-3">
                    <span className="mt-0.5 text-slate-500">
                      {previewTrashItem.completed ? <CheckCircle size={20} className="text-green-500" /> : <CircleIcon size={20} />}
                    </span>
                    <div className="flex-1">
                      <p className={previewTrashItem.completed ? 'line-through text-slate-400' : 'text-white'}>
                        {previewTrashItem.text || <span className="italic text-slate-500">Empty task</span>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <button 
                type="button"
                onClick={() => {
                  const item = previewTrashItem;
                  setPreviewTrashItem(null);
                  openPermanentDeleteModal(item);
                }}
                className="px-4 py-2 text-red-400 hover:text-white hover:bg-red-600 rounded-lg transition-colors font-medium flex items-center gap-1.5 text-sm"
              >
                <X size={16} /> Delete Permanently
              </button>
              <div className="flex items-center gap-3">
                <button 
                  type="button"
                  onClick={() => setPreviewTrashItem(null)}
                  className="px-4 py-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors font-medium text-sm"
                >
                  Close
                </button>
                <button 
                  type="button"
                  onClick={() => handleRestoreItem(previewTrashItem)}
                  className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-1.5 font-medium text-sm shadow-lg shadow-emerald-600/20"
                >
                  <RefreshCcw size={16} /> Restore {previewTrashItem.itemType === 'note' ? 'Note' : 'Task'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspace;

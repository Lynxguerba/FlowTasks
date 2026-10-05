import { useState, useEffect, useRef } from 'react';
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
  Edit2,
  X,
  Save
} from 'lucide-react';
import { getNotes, saveNotes, getCanvas, saveCanvas } from '../data/storage';

const ProjectWorkspace = ({ project, onBack }) => {
  const [activeSidebarTab, setActiveSidebarTab] = useState('notes'); 
  
  // Notes state
  const [notes, setNotes] = useState(() => getNotes(project.id));
  useEffect(() => { saveNotes(project.id, notes); }, [notes, project.id]);
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [noteInput, setNoteInput] = useState('');
  const [noteTitleInput, setNoteTitleInput] = useState('');

  const handleCreateNote = () => {
    const newNote = { id: Date.now(), title: 'New Note', content: '', date: new Date().toLocaleDateString() };
    setNotes([newNote, ...notes]);
    setEditingNoteId(newNote.id);
    setNoteTitleInput(newNote.title);
    setNoteInput(newNote.content);
    setActiveSidebarTab('notes');
  };

  const handleSaveNote = (id) => {
    setNotes(notes.map(n => n.id === id ? { ...n, title: noteTitleInput, content: noteInput } : n));
    setEditingNoteId(null);
  };

  const handleDeleteNote = (id) => {
    setNotes(notes.filter(n => n.id !== id));
    if (editingNoteId === id) setEditingNoteId(null);
  };

  const handleEditNote = (note) => {
    setEditingNoteId(note.id);
    setNoteTitleInput(note.title);
    setNoteInput(note.content);
  };

  // Canvas State
  const initialCanvas = getCanvas(project.id);
  const [nodes, setNodes] = useState(initialCanvas.nodes || []);
  const [connections, setConnections] = useState(initialCanvas.connections || []);
  
  useEffect(() => {
    saveCanvas(project.id, { nodes, connections });
  }, [nodes, connections, project.id]);

  const canvasRef = useRef(null);
  const [draggingNode, setDraggingNode] = useState(null); 
  const [drawingConnection, setDrawingConnection] = useState(null); 
  const [hoveredEdge, setHoveredEdge] = useState(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState([]);
  const [selectionBox, setSelectionBox] = useState(null);

  // Zoom and Pan State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  // Keyboard events for Spacebar panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
        e.preventDefault(); // Prevent page scroll
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
          const zoomAmount = e.deltaY * -0.002;
          let newZoom = prevZoom + zoomAmount;
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
      text: ''
    };
    setNodes([...nodes, newNode]);
  };

  // Node Dragging
  const startDragNode = (e, node) => {
    e.stopPropagation();
    if (drawingConnection || isSpacePressed) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    const localX = (mouseX - pan.x) / zoom;
    const localY = (mouseY - pan.y) / zoom;
    
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
    e.stopPropagation();
    if (isSpacePressed) return;
    
    let startX = node.x + 48;
    let startY = node.y + 48;
    if (handlePos === 'right') startX += 48;
    if (handlePos === 'left') startX -= 48;
    if (handlePos === 'bottom') startY += 48;
    if (handlePos === 'top') startY -= 48;
    
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
        const nodeCenterX = node.x + 48;
        const nodeCenterY = node.y + 48;
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
    if (draggingNode) setDraggingNode(null);
    if (drawingConnection) setDrawingConnection(null);
    if (selectionBox) setSelectionBox(null);
  };

  const handleNodeMouseUp = (e, targetNode) => {
    if (drawingConnection && drawingConnection.fromId !== targetNode.id) {
      setConnections([
        ...connections, 
        { 
          id: Date.now().toString(), 
          from: drawingConnection.fromId, 
          fromHandle: drawingConnection.fromHandle,
          to: targetNode.id 
        }
      ]);
      setDrawingConnection(null);
    }
  };

  const updateNodeText = (id, text) => {
    setNodes(nodes.map(n => n.id === id ? { ...n, text } : n));
  };

  const deleteNode = (e, id) => {
    e.stopPropagation();
    setNodes(nodes.filter(n => n.id !== id));
    setConnections(connections.filter(c => c.from !== id && c.to !== id));
  };

  const deleteConnection = (id) => {
    setConnections(connections.filter(c => c.id !== id));
  };

  const handleNodeHoverMove = (e, node) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 48; // center is 0,0
    const y = e.clientY - rect.top - 48;
    
    let edge = 'right';
    if (Math.abs(x) > Math.abs(y)) {
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
        </div>
      </div>

      {/* Expandable Sidebar Content */}
      {activeSidebarTab && (
        <div className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col z-10 shadow-xl">
          <div className="h-16 flex items-center justify-between px-6 border-b border-slate-700 flex-shrink-0">
            <h2 className="text-lg font-bold text-white capitalize">{activeSidebarTab}</h2>
            {activeSidebarTab === 'notes' && (
              <button onClick={handleCreateNote} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700 transition-colors" title="Create Note">
                <Plus size={18} />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {activeSidebarTab === 'layouts' && (
              <div className="text-slate-400 text-center mt-10">
                <Layout size={40} className="mx-auto mb-4 opacity-50" />
                <p>Layout options will appear here.</p>
              </div>
            )}
            {activeSidebarTab === 'notes' && (
              <div className="space-y-4">
                {notes.length === 0 ? (
                  <div className="text-center text-slate-500 mt-10">
                    <p>No notes yet.</p>
                    <button onClick={handleCreateNote} className="text-blue-400 hover:text-blue-300 text-sm mt-2 font-medium">Create your first note</button>
                  </div>
                ) : (
                  notes.map(note => (
                    <div key={note.id} className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
                      {editingNoteId === note.id ? (
                        <div className="p-3">
                          <input type="text" value={noteTitleInput} onChange={(e) => setNoteTitleInput(e.target.value)} className="w-full bg-slate-800 text-white font-medium px-3 py-2 rounded-lg mb-2 focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Note Title" />
                          <textarea value={noteInput} onChange={(e) => setNoteInput(e.target.value)} className="w-full bg-slate-800 text-slate-300 text-sm px-3 py-2 rounded-lg mb-3 min-h-[120px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" placeholder="Write your note here..." />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => { if (!note.content && !note.title.trim()) handleDeleteNote(note.id); else setEditingNoteId(null); }} className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">Cancel</button>
                            <button onClick={() => handleSaveNote(note.id)} className="px-3 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded-lg transition-colors flex items-center gap-1"><Save size={14} /> Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 group">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-white truncate pr-2">{note.title}</h3>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleEditNote(note)} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-700"><Edit2 size={14} /></button>
                              <button onClick={() => handleDeleteNote(note.id)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-700"><Trash2 size={14} /></button>
                            </div>
                          </div>
                          <p className="text-sm text-slate-400 whitespace-pre-wrap mb-3 line-clamp-3">{note.content || "Empty note..."}</p>
                          <div className="text-xs text-slate-500">{note.date}</div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Canvas Area */}
      <div className="flex-1 bg-slate-900 relative overflow-hidden">
        {/* Canvas header */}
        <div className="absolute top-0 left-0 right-0 h-16 flex items-center px-6 pointer-events-none z-10">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg ${project.color} opacity-80`} />
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
          </div>
          <div className="ml-auto group relative pointer-events-auto flex items-center">
            <div className="bg-slate-800 px-4 py-2 rounded-full text-sm font-medium text-slate-300 border border-slate-700 shadow-md flex items-center gap-2 transition-all">
              <span className="w-10 text-right">{Math.round(zoom * 100)}%</span>
              <div className="w-0 overflow-hidden group-hover:w-32 transition-all duration-300 ease-out flex items-center ml-0 group-hover:ml-2">
                <input 
                  type="range" 
                  min="0.1" 
                  max="3" 
                  step="0.05" 
                  value={zoom} 
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Interactive Canvas */}
        <div 
          ref={canvasRef}
          className={`w-full h-full relative ${isSpacePressed ? (isPanning ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
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
                <p className="text-sm mt-2">Space + Drag to pan. Ctrl + Scroll to zoom.</p>
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
                
                const fromHandle = conn.fromHandle || 'right';
                let startX = fromNode.x + 48;
                let startY = fromNode.y + 48;
                let cp1X = startX; 
                let cp1Y = startY;
                
                if (fromHandle === 'right') { startX += 48; cp1X += 50; }
                if (fromHandle === 'left') { startX -= 48; cp1X -= 50; }
                if (fromHandle === 'bottom') { startY += 48; cp1Y += 50; }
                if (fromHandle === 'top') { startY -= 48; cp1Y -= 50; }

                const targetCenterX = toNode.x + 48;
                const targetCenterY = toNode.y + 48;
                
                let endX = targetCenterX;
                let endY = targetCenterY;
                
                const dx = targetCenterX - startX;
                const dy = targetCenterY - startY;
                
                if (Math.abs(dx) > Math.abs(dy)) {
                  endX = dx > 0 ? toNode.x - 4 : toNode.x + 100;
                } else {
                  endY = dy > 0 ? toNode.y - 4 : toNode.y + 100;
                }
                
                let cp2X = endX;
                let cp2Y = endY;
                if (endX < toNode.x) cp2X -= 50;
                else if (endX > toNode.x + 90) cp2X += 50;
                else if (endY < toNode.y) cp2Y -= 50;
                else if (endY > toNode.y + 90) cp2Y += 50;
                
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

            {/* Render Nodes */}
            {nodes.map(node => {
              const isExpandable = ['Square', 'Text'].includes(node.type);
              return (
              <div
                key={node.id}
                style={{ left: node.x, top: node.y }}
                className={`absolute group z-10 flex items-center justify-center p-4 ${isExpandable ? 'w-fit h-fit min-w-[6rem] min-h-[6rem] max-w-[16rem]' : 'w-24 h-24'} ${selectedNodeIds.includes(node.id) ? 'ring-2 ring-blue-500 rounded-lg bg-blue-500/10' : ''}`}
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
                
                {/* Text Input (Auto-expanding) */}
                <div className="relative z-11 grid w-full">
                  <div className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-words text-center text-sm font-medium px-1">
                    {node.text || 'Type...'}
                    {' '}
                  </div>
                  <textarea
                    value={node.text}
                    onChange={(e) => updateNodeText(node.id, e.target.value)}
                    onMouseDown={(e) => e.stopPropagation()} 
                    placeholder="Type..."
                    className="col-start-1 row-start-1 resize-none overflow-hidden bg-transparent text-center text-sm font-medium text-white focus:outline-none placeholder-slate-500 break-words"
                    rows={1}
                  />
                </div>

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
                  className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:scale-110 hover:bg-red-500 transition-all z-20 shadow-lg"
                  onMouseDown={(e) => deleteNode(e, node.id)}
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
    </div>
  );
};

export default ProjectWorkspace;

import { memo, useState, useCallback } from 'react';
import { Plus, X, Trash2, RefreshCcw } from 'lucide-react';

const getShapeStyles = (type, isDeleted, isCompleted) => {
  const base = (() => {
    switch (type) {
      case 'Circle': return { borderRadius: '50%' };
      case 'Triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
      case 'Hexagon': return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
      case 'Text': return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' };
      case 'Square': default: return { borderRadius: '8px' };
    }
  })();
  if (isDeleted && (type === 'Triangle' || type === 'Hexagon')) {
    return { ...base, filter: 'drop-shadow(0 0 3px #ef4444)' };
  }
  if (isCompleted && (type === 'Triangle' || type === 'Hexagon')) {
    return { ...base, filter: 'drop-shadow(0 0 3px #22c55e)' };
  }
  return base;
};

const CanvasNode = memo(({
  node,
  isSelected,
  isSpacePressed,
  onStartDrag,
  onStartResize,
  onStartConnection,
  onMouseUp,
  onDelete,
  onRestore,
  onTextChange,
  onTextFocus,
  onTextBlur,
}) => {
  // Localized edge hover detection: avoids triggering re-renders in the parent or peer nodes
  const [hoveredEdge, setHoveredEdge] = useState(null);

  const isText = node.type === 'Text';
  const isResizable = node.type === 'Square' || node.type === 'Circle';
  const w = node.width || 96;
  const h = node.height || 96;
  const nodeStyle = isResizable ? { left: node.x, top: node.y, width: w, height: h } : { left: node.x, top: node.y };
  const nodeClass = isText 
    ? 'w-fit h-fit min-w-[6rem] min-h-[6rem] max-w-[16rem]' 
    : isResizable ? '' : 'w-24 h-24';

  const getBorderClasses = () => {
    if (node.isDeleted) {
      return 'border-red-500 shadow-md shadow-red-500/30 ring-1 ring-red-500/60';
    }
    if (node.isRoot) {
      return 'border-slate-400 group-hover:border-slate-300';
    }
    if (node.isCompleted) {
      return 'border-green-500 group-hover:border-green-400 shadow-md shadow-green-500/25 ring-1 ring-green-500/50';
    }
    if (node.nodeType === 'flow') {
      return 'border-white group-hover:border-slate-200';
    }
    if (node.nodeType === 'task') {
      return 'border-blue-500 group-hover:border-blue-400';
    }
    return 'border-slate-600 group-hover:border-blue-400';
  };

  const handleMouseMove = useCallback((e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2; // center is 0,0
    const y = e.clientY - rect.top - rect.height / 2;
    
    let edge;
    if (Math.abs(x) / rect.width > Math.abs(y) / rect.height) {
      edge = x > 0 ? 'right' : 'left';
    } else {
      edge = y > 0 ? 'bottom' : 'top';
    }
    
    setHoveredEdge(prev => (prev === edge ? prev : edge));
  }, []);

  const handleMouseLeave = useCallback(() => {
    setHoveredEdge(null);
  }, []);

  return (
    <div
      style={nodeStyle}
      className={`absolute group z-10 flex items-center justify-center p-4 ${nodeClass} ${isSelected ? 'ring-2 ring-blue-500 rounded-lg bg-blue-500/10' : ''} ${node.isDeleted ? 'opacity-90' : ''}`}
      onMouseDown={(e) => onStartDrag(e, node)}
      onMouseUp={(e) => onMouseUp(e, node)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Shape background */}
      <div 
        className={`absolute inset-0 bg-slate-800 border-2 transition-colors shadow-lg ${getBorderClasses()}`}
        style={getShapeStyles(node.type, node.isDeleted, node.isCompleted)}
      />

      {/* Deleted Indicator Tag */}
      {node.isDeleted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow pointer-events-none z-30 uppercase tracking-wider flex items-center gap-1">
          <Trash2 size={10} /> Deleted
        </span>
      )}
      
      {/* Text Input */}
      <div className="relative z-11 flex items-center justify-center w-full h-full pointer-events-none">
        <div className="grid w-full min-w-0 pointer-events-auto">
          <div className="col-start-1 row-start-1 invisible whitespace-pre-wrap break-words text-center text-sm font-medium px-1 min-w-0">
            {node.text || 'Type...'}
            {' '}
          </div>
          <textarea
            value={node.text}
            onChange={(e) => onTextChange(node.id, e.target.value)}
            onFocus={(e) => onTextFocus(node, e.target.value)}
            onBlur={(e) => onTextBlur(node, e.target.value)}
            onMouseDown={(e) => {
              if (isSpacePressed) return;
              e.stopPropagation();
            }} 
            readOnly={node.isDeleted}
            placeholder="Type..."
            className={`col-start-1 row-start-1 resize-none overflow-hidden bg-transparent text-center text-sm font-medium text-white focus:outline-none placeholder-slate-500 break-words whitespace-pre-wrap px-1 min-w-0 ${isResizable ? 'w-full h-full' : ''} ${node.isCompleted || node.isDeleted ? 'line-through text-slate-400' : ''}`}
            rows={1}
          />
        </div>
      </div>

      {/* Resize Handle for Square & Circle */}
      {isResizable && !node.isDeleted && (
        <div 
          className="absolute bottom-1 right-1 w-5 h-5 cursor-se-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-30"
          onMouseDown={(e) => onStartResize(e, node)}
          title="Resize shape"
        >
          <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 hover:text-white">
            <polyline points="21 15 21 21 15 21"></polyline>
            <line x1="21" y1="21" x2="14" y2="14"></line>
          </svg>
        </div>
      )}

      {/* Connect Buttons (only if not deleted) */}
      {!node.isDeleted && (
        <>
          <button 
            className={`absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge === 'top' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onMouseDown={(e) => onStartConnection(e, node, 'top')}
            title="Drag to connect from top"
          >
            <Plus size={14} className="text-white" />
          </button>
          <button 
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge === 'bottom' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onMouseDown={(e) => onStartConnection(e, node, 'bottom')}
            title="Drag to connect from bottom"
          >
            <Plus size={14} className="text-white" />
          </button>
          <button 
            className={`absolute top-1/2 -left-3 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge === 'left' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onMouseDown={(e) => onStartConnection(e, node, 'left')}
            title="Drag to connect from left"
          >
            <Plus size={14} className="text-white" />
          </button>
          <button 
            className={`absolute top-1/2 -right-3 -translate-y-1/2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-20 cursor-crosshair shadow-lg ${hoveredEdge === 'right' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onMouseDown={(e) => onStartConnection(e, node, 'right')}
            title="Drag to connect from right"
          >
            <Plus size={14} className="text-white" />
          </button>
        </>
      )}

      {/* Action Buttons (Delete, Restore, Permanent Delete) */}
      {!node.isRoot && (
        <div className={`absolute -top-3 -right-3 flex items-center gap-1 z-20 transition-all ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {node.isDeleted ? (
            <>
              {onRestore && (
                <button 
                  className="w-6 h-6 bg-emerald-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-emerald-500 transition-all shadow-lg"
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    onRestore(e);
                  }}
                  title="Restore task from trash"
                >
                  <RefreshCcw size={11} className="text-white" />
                </button>
              )}
              <button 
                className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all shadow-lg"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  onDelete(e, node.id, isSelected);
                }}
                title="Permanently delete node"
              >
                <X size={12} className="text-white" />
              </button>
            </>
          ) : (
            <button 
              className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all shadow-lg"
              onMouseDown={(e) => {
                e.stopPropagation();
                onDelete(e, node.id, isSelected);
              }}
              title="Delete node (move to trash)"
            >
              <X size={12} className="text-white" />
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default CanvasNode;

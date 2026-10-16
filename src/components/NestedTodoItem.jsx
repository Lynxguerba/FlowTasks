import { memo } from 'react';
import { 
  ChevronRight, 
  CheckCircle, 
  Circle as CircleIcon, 
  GitBranch, 
  Trash2, 
  Plus 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const NestedTodoItem = memo(({
  todo,
  childTodos = [],
  childrenByParent,
  expandedNodeIds,
  onToggleExpand,
  onToggleCompletion,
  onEdit,
  onDelete,
  onSwitchType,
  onCreateSubTodo,
  depth = 0,
  visitedPath = new Set(),
}) => {
  const isFlow = todo.nodeType === 'flow';
  const hasChildren = childTodos && childTodos.length > 0;
  const isExpanded = expandedNodeIds.has(todo.id);

  // Sub-task progress
  const completedCount = hasChildren ? childTodos.filter(c => c.completed).length : 0;

  const getContainerBorder = () => {
    if (isExpanded) {
      if (depth > 0) {
        return 'border-white ring-2 ring-white/40 shadow-lg shadow-white/15 bg-slate-900';
      }
      return 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/15 bg-slate-900';
    }
    // Child container nodes - highlighted with white border
    if (depth > 0) {
      if (todo.completed) {
        return 'border-white/70 bg-slate-900/60 opacity-85 hover:border-white ring-1 ring-white/20';
      }
      return 'border-white ring-1 ring-white/30 shadow-md shadow-white/10 bg-slate-900 hover:border-white';
    }
    if (todo.completed) {
      return 'border-slate-800 bg-slate-900/40 opacity-80';
    }
    if (isFlow) {
      return 'border-slate-700/90 hover:border-slate-500 bg-slate-900/95 shadow-sm shadow-slate-950/40';
    }
    return 'border-slate-800 hover:border-blue-500/50 bg-slate-900/85 shadow-sm';
  };

  return (
    <div className="flex flex-col w-full">
      {/* Todo Card Container - Constant full width for parent and children */}
      <div 
        onClick={(e) => onEdit(todo, e)}
        className={`w-full rounded-xl border transition-all cursor-pointer group/todo relative flex flex-col ${getContainerBorder()}`}
      >
        <div className="p-3 flex items-start gap-2">
          {/* Expand/Collapse Chevron (if has children) */}
          {hasChildren ? (
            <button 
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onToggleExpand(todo.id, e)}
              className="p-1 -ml-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-colors flex-shrink-0 mt-0.5"
              title={isExpanded ? "Collapse sub-nodes" : "Expand sub-nodes"}
            >
              <ChevronRight 
                size={15} 
                className={`transform transition-transform duration-200 ${isExpanded ? 'rotate-90 text-blue-400' : 'text-slate-400'}`} 
              />
            </button>
          ) : (
            <span className="w-5 flex items-center justify-center text-slate-600 text-[10px] mt-1.5 flex-shrink-0">
              •
            </span>
          )}

          {/* Task Checkbox or Flow Icon */}
          {!isFlow ? (
            <button 
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onToggleCompletion(todo.id, e)} 
              className={`mt-0.5 flex-shrink-0 transition-colors ${todo.completed ? 'text-green-500' : 'text-slate-400 hover:text-white'}`}
              title={todo.completed ? "Mark incomplete" : "Mark complete"}
            >
              {todo.completed ? <CheckCircle size={18} /> : <CircleIcon size={18} />}
            </button>
          ) : (
            <div className="mt-0.5 flex-shrink-0 text-slate-300 p-0.5" title="Flow connector">
              <GitBranch size={16} />
            </div>
          )}

          {/* Content & Badges */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1 flex-wrap">
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => onSwitchType(todo.id, isFlow ? 'task' : 'flow', e)}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded transition-all cursor-pointer hover:scale-105 ${
                  isFlow 
                    ? 'bg-slate-700/80 text-white border border-slate-500/60 hover:bg-slate-600' 
                    : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
                }`}
                title={`Switch to ${isFlow ? 'Task' : 'Flow'}`}
              >
                {isFlow ? '◇ Flow ⇄' : '□ Task ⇄'}
              </button>

              {/* Sub-node hierarchy indicator when nested */}
              {depth > 0 && (
                <span className="text-[10px] font-medium text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600/60">
                  ↳ Sub-node
                </span>
              )}
              
              {todo.shape && (
                <span className="text-[10px] text-slate-500">
                  • {todo.shape}
                </span>
              )}

              {/* Sub-node count & status badge */}
              {hasChildren && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => onToggleExpand(todo.id, e)}
                  className={`text-[10px] border px-2 py-0.5 rounded-full font-medium transition-colors ${
                    isExpanded 
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                      : 'bg-slate-800 text-slate-300 hover:text-white border-slate-700'
                  }`}
                  title={isExpanded ? "Click to collapse" : "Click to expand"}
                >
                  {childTodos.length} {childTodos.length === 1 ? 'sub-node' : 'sub-nodes'}
                  {childTodos.some(c => c.nodeType === 'task') && (
                    <span className="text-slate-400 ml-1 font-normal">
                      ({completedCount}/{childTodos.length} done)
                    </span>
                  )}
                </button>
              )}
            </div>

            <p className={`text-sm whitespace-pre-wrap line-clamp-2 ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
              {todo.text || (isFlow ? "Untitled flow..." : "Empty task...")}
            </p>

            <div className="text-[10px] text-slate-500 mt-1">{todo.date}</div>
          </div>

          {/* Quick Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover/todo:opacity-100 transition-opacity flex-shrink-0">
            <button 
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onCreateSubTodo(todo.id, e)} 
              className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Add connected sub-node"
            >
              <Plus size={14} />
            </button>
            <button 
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => onDelete(todo.id, e)} 
              className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-slate-800 transition-colors"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Animated Collapsible Sub-nodes container - Same container size for all items */}
      <AnimatePresence initial={false}>
        {isExpanded && hasChildren && (
          <motion.div
            key={`sub-${todo.id}`}
            initial={{ opacity: 0, height: 0 }}
            animate={{ 
              opacity: 1, 
              height: 'auto',
              transition: {
                height: { duration: 0.28, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.2, delay: 0.05 }
              }
            }}
            exit={{ 
              opacity: 0, 
              height: 0,
              transition: {
                height: { duration: 0.22, ease: [0.04, 0.62, 0.23, 0.98] },
                opacity: { duration: 0.15 }
              }
            }}
            className="overflow-hidden w-full space-y-2 mt-2"
          >
            {/* Header banner explaining connection relationship */}
            <div className="flex items-center justify-between px-2.5 py-1 text-[11px] font-medium text-slate-400 bg-slate-800/70 rounded-lg border border-slate-700/50 w-full">
              <div className="flex items-center gap-1.5 truncate">
                <GitBranch size={12} className="text-blue-400 flex-shrink-0" />
                <span className="truncate">
                  Connected under <span className="text-slate-200 font-semibold">{todo.text ? (todo.text.length > 20 ? todo.text.slice(0, 20) + '...' : todo.text) : (isFlow ? 'Flow' : 'Task')}</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400 flex-shrink-0 font-mono">
                {childTodos.length} {childTodos.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {/* Child items with identical full container width */}
            {childTodos.map(child => {
              if (visitedPath.has(child.id)) {
                return (
                  <div key={child.id} className="text-xs text-amber-500 italic py-1 px-2">
                    [Circular connection to {child.text || child.id}]
                  </div>
                );
              }
              const nextVisited = new Set(visitedPath).add(child.id);
              const grandChildren = childrenByParent.get(child.id) || [];
              return (
                <NestedTodoItem
                  key={child.id}
                  todo={child}
                  childTodos={grandChildren}
                  childrenByParent={childrenByParent}
                  expandedNodeIds={expandedNodeIds}
                  onToggleExpand={onToggleExpand}
                  onToggleCompletion={onToggleCompletion}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onSwitchType={onSwitchType}
                  onCreateSubTodo={onCreateSubTodo}
                  depth={depth + 1}
                  visitedPath={nextVisited}
                />
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default NestedTodoItem;

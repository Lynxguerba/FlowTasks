import { memo } from 'react';
import { 
  ChevronRight, 
  CheckCircle, 
  Circle as CircleIcon, 
  GitBranch, 
  Trash2, 
  Plus 
} from 'lucide-react';

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

  return (
    <div className="flex flex-col">
      <div 
        onClick={(e) => onEdit(todo, e)}
        className={`rounded-xl border transition-all cursor-pointer group/todo relative flex flex-col ${
          todo.completed 
            ? 'border-slate-800 bg-slate-900/40 opacity-80' 
            : isFlow 
              ? 'border-slate-700/90 hover:border-slate-500 bg-slate-900/95 shadow-sm shadow-slate-950/40' 
              : 'border-slate-800 hover:border-blue-500/50 bg-slate-900/85 shadow-sm'
        }`}
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
                  className="text-[10px] bg-slate-800 text-slate-300 hover:text-white border border-slate-700 px-2 py-0.5 rounded-full font-medium transition-colors"
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

      {/* Collapsible / Expandable Sub-nodes container */}
      {isExpanded && hasChildren && (
        <div className="ml-3 pl-2.5 border-l-2 border-slate-700/60 space-y-2 mt-2 mb-1">
          {childTodos.map(child => {
            if (visitedPath.has(child.id)) {
              return (
                <div key={child.id} className="text-xs text-amber-500 italic py-1">
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
        </div>
      )}
    </div>
  );
});

export default NestedTodoItem;

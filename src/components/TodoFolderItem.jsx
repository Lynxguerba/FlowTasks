import { memo } from 'react';
import { 
  FolderOpen, 
  Folder,
  CheckCircle, 
  Circle as CircleIcon, 
  GitBranch, 
  Trash2, 
  Plus 
} from 'lucide-react';

const TodoFolderItem = memo(({
  todo,
  childCount = 0,
  completedChildCount = 0,
  onOpenFolder,
  onToggleCompletion,
  onEdit,
  onDelete,
  onSwitchType,
  onCreateSubTodo,
  isInsideFolder = false,
}) => {
  const isFlow = todo.nodeType === 'flow';

  const getContainerBorder = () => {
    // Child container nodes inside a folder - highlighted with white border
    if (isInsideFolder) {
      if (todo.completed) {
        return 'border-white/70 bg-slate-900/60 opacity-85 hover:border-white ring-1 ring-white/20';
      }
      return 'border-white ring-1 ring-white/30 shadow-md shadow-white/10 bg-slate-900 hover:border-white';
    }

    // Root-level nodes
    if (todo.completed) {
      return 'border-slate-800 bg-slate-900/40 opacity-80';
    }
    if (isFlow) {
      return 'border-slate-700/90 hover:border-slate-500 bg-slate-900/95 shadow-sm shadow-slate-950/40';
    }
    return 'border-slate-800 hover:border-blue-500/50 bg-slate-900/85 shadow-sm';
  };

  return (
    <div 
      onClick={(e) => onEdit(todo, e)}
      className={`w-full rounded-xl border transition-all cursor-pointer group/todo relative flex flex-col ${getContainerBorder()}`}
    >
      <div className="p-3 flex items-start gap-2.5">
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

            {/* Sub-node hierarchy indicator when inside a folder */}
            {isInsideFolder && (
              <span className="text-[10px] font-medium text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-600/60">
                ↳ Sub-node
              </span>
            )}
            
            {todo.shape && (
              <span className="text-[10px] text-slate-500">
                • {todo.shape}
              </span>
            )}

            {/* Child items / folder badge */}
            {childCount > 0 && (
              <span className="text-[10px] bg-blue-500/15 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                <Folder size={10} className="text-blue-400" />
                {childCount} {childCount === 1 ? 'sub-item' : 'sub-items'}
                {completedChildCount > 0 && (
                  <span className="text-slate-400 ml-0.5 font-normal">
                    ({completedChildCount}/{childCount} done)
                  </span>
                )}
              </span>
            )}
          </div>

          <p className={`text-sm whitespace-pre-wrap line-clamp-2 ${todo.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
            {todo.text || (isFlow ? "Untitled flow..." : "Empty task...")}
          </p>

          <div className="text-[10px] text-slate-500 mt-1">{todo.date}</div>
        </div>

        {/* Right Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* OPEN FOLDER BUTTON */}
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onOpenFolder(todo.id);
            }}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600 text-blue-300 hover:text-white border border-blue-500/40 hover:border-blue-400 text-xs font-semibold transition-all shadow-sm group/open cursor-pointer"
            title={`Open ${todo.text ? `"${todo.text}"` : 'folder'}`}
          >
            <FolderOpen size={13} className="text-blue-400 group-hover/open:text-white transition-colors" />
            <span>Open</span>
          </button>

          {/* Quick Add Sub-node */}
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onCreateSubTodo(todo.id, e)} 
            className="text-blue-400 hover:text-blue-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover/todo:opacity-100"
            title="Add connected sub-item"
          >
            <Plus size={15} />
          </button>

          {/* Delete button */}
          <button 
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => onDelete(todo.id, e)} 
            className="text-red-400 hover:text-red-300 p-1.5 rounded-lg hover:bg-slate-800 transition-colors opacity-0 group-hover/todo:opacity-100"
            title="Delete item"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
});

export default TodoFolderItem;

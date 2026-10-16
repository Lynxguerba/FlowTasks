import { memo } from 'react';
import { X, Copy } from 'lucide-react';

const SelectionBounds = memo(({ bounds, onDelete, onCopy }) => {
  if (!bounds) return null;

  return (
    <div
      style={{
        left: bounds.x - 8,
        top: bounds.y - 8,
        width: bounds.width + 16,
        height: bounds.height + 16,
      }}
      className="absolute border-2 border-dashed border-blue-400/80 bg-blue-500/5 rounded-xl pointer-events-none z-15"
    >
      {/* Count badge */}
      <div className="absolute -top-3 left-2 bg-blue-600 text-white text-[11px] font-semibold px-2 py-0.5 rounded-full shadow pointer-events-none select-none">
        {bounds.count} selected
      </div>

      {/* Action buttons: Copy & Delete */}
      <div className="absolute -top-3 right-0 translate-x-2 flex items-center gap-1 pointer-events-auto">
        {onCopy && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.stopPropagation();
              onCopy();
            }}
            className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-blue-500 transition-all z-30 shadow-lg cursor-pointer"
            title={`Copy ${bounds.count} selected shapes (Ctrl+C)`}
          >
            <Copy size={12} className="text-white" />
          </button>
        )}
        <button
          type="button"
          onMouseDown={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center hover:scale-110 hover:bg-red-500 transition-all z-30 shadow-lg cursor-pointer"
          title={`Delete ${bounds.count} selected shapes (Delete)`}
        >
          <X size={12} className="text-white" />
        </button>
      </div>
    </div>
  );
});

export default SelectionBounds;

import { memo } from 'react';

const SelectionBox = memo(({ box }) => {
  if (!box) return null;

  return (
    <div 
      className="absolute border border-blue-400 bg-blue-500/20 z-50 pointer-events-none"
      style={{
        left: Math.min(box.startX, box.endX),
        top: Math.min(box.startY, box.endY),
        width: Math.abs(box.startX - box.endX),
        height: Math.abs(box.startY - box.endY)
      }}
    />
  );
});

export default SelectionBox;

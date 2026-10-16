import { memo } from 'react';

const CanvasConnection = memo(({ conn, fromNode, toNode, onDelete }) => {
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
      className="group/conn cursor-pointer pointer-events-auto"
      onMouseDown={(e) => { e.stopPropagation(); onDelete(conn.id); }}
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
});

export default CanvasConnection;

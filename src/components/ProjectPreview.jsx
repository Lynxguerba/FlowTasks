import { useState, useEffect } from 'react';
import { getCanvas } from '../data/storage';

const ProjectPreview = ({ projectId, color, isTrash = false }) => {
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  
  useEffect(() => {
    getCanvas(projectId).then(data => {
      if (data) {
        if (data.nodes) setNodes(data.nodes);
        if (data.connections) setConnections(data.connections);
      }
    });
  }, [projectId]);

  const heightClass = isTrash ? "h-32" : "h-40";
  const bgClass = isTrash ? "bg-slate-800 grayscale" : "bg-slate-700/50 group-hover:bg-slate-700";

  if (nodes.length === 0) {
    if (isTrash) {
      return (
        <div className={`${heightClass} ${bgClass} relative overflow-hidden flex items-center justify-center rounded-t-xl`}>
          <div className={`w-16 h-16 rounded-2xl ${color} opacity-10`} />
        </div>
      );
    }
    return (
      <div className={`${heightClass} ${bgClass} relative overflow-hidden flex items-center justify-center transition-colors rounded-t-xl`}>
        <div className={`w-16 h-16 rounded-2xl ${color} opacity-20 group-hover:opacity-40 transition-opacity transform group-hover:scale-110 duration-500 rotate-12`} />
        <div className={`absolute w-12 h-12 rounded-full ${color} opacity-40 blur-xl top-4 left-4`} />
      </div>
    );
  }

  const getShapeStyles = (type) => {
    switch (type) {
      case 'Circle': return { borderRadius: '50%' };
      case 'Triangle': return { clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)' };
      case 'Hexagon': return { clipPath: 'polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)' };
      case 'Text': return { background: 'transparent', borderColor: 'transparent', boxShadow: 'none' };
      case 'Square': default: return { borderRadius: '8px' };
    }
  };

  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  const maxX = Math.max(...nodes.map(n => n.x + (n.width || 96)));
  const maxY = Math.max(...nodes.map(n => n.y + (n.height || 96)));
  
  const width = maxX - minX;
  const height = maxY - minY;
  
  const padding = 40;
  const viewBoxWidth = width + padding * 2;
  const viewBoxHeight = height + padding * 2;
  
  const targetHeight = isTrash ? 128 : 160;
  
  const scaleX = 280 / viewBoxWidth; 
  const scaleY = targetHeight / viewBoxHeight;
  const scale = Math.min(scaleX, scaleY, 0.4); 

  const offsetX = -minX + padding;
  const offsetY = -minY + padding;

  return (
    <div className={`${heightClass} ${bgClass} relative overflow-hidden flex items-center justify-center rounded-t-xl transition-colors`}>
      <div 
        className="relative"
        style={{
          transform: `scale(${scale})`,
          width: viewBoxWidth,
          height: viewBoxHeight,
          transformOrigin: 'center center'
        }}
      >
        <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
          {connections.map(conn => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;
            
            const fromW = fromNode.width || 96;
            const fromH = fromNode.height || 96;
            const fromHandle = conn.fromHandle || 'right';
            let startX = fromNode.x + fromW / 2 + offsetX;
            let startY = fromNode.y + fromH / 2 + offsetY;
            let cp1X = startX; 
            let cp1Y = startY;
            
            if (fromHandle === 'right') { startX += fromW / 2; cp1X += 50; }
            if (fromHandle === 'left') { startX -= fromW / 2; cp1X -= 50; }
            if (fromHandle === 'bottom') { startY += fromH / 2; cp1Y += 50; }
            if (fromHandle === 'top') { startY -= fromH / 2; cp1Y -= 50; }

            const toW = toNode.width || 96;
            const toH = toNode.height || 96;
            const targetCenterX = toNode.x + toW / 2 + offsetX;
            const targetCenterY = toNode.y + toH / 2 + offsetY;
            
            let endX = targetCenterX;
            let endY = targetCenterY;
            
            const dx = targetCenterX - startX;
            const dy = targetCenterY - startY;
            
            if (Math.abs(dx) > Math.abs(dy)) {
              endX = dx > 0 ? toNode.x + offsetX - 4 : toNode.x + offsetX + toW + 4;
            } else {
              endY = dy > 0 ? toNode.y + offsetY - 4 : toNode.y + offsetY + toH + 4;
            }
            
            let cp2X = endX;
            let cp2Y = endY;
            if (endX < toNode.x + offsetX) cp2X -= 50;
            else if (endX > toNode.x + offsetX + toW - 10) cp2X += 50;
            else if (endY < toNode.y + offsetY) cp2Y -= 50;
            else if (endY > toNode.y + offsetY + toH - 10) cp2Y += 50;
            
            const pathData = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;
            
            return (
              <path
                key={conn.id}
                d={pathData}
                fill="none"
                className="stroke-slate-500 opacity-50"
                strokeWidth="4"
              />
            );
          })}
        </svg>
        {nodes.map(node => (
          <div
            key={node.id}
            className={`absolute border-2 border-slate-600 bg-slate-800 shadow-sm ${node.type === 'Text' ? 'border-none bg-transparent' : ''}`}
            style={{
              ...getShapeStyles(node.type),
              left: node.x + offsetX,
              top: node.y + offsetY,
              width: node.width || 96,
              height: node.height || 96,
            }}
          >
            {node.text && (
              <div className="w-full h-full flex items-center justify-center text-slate-300 font-medium whitespace-pre-wrap break-words text-center text-[14px] px-1 min-w-0">
                {node.text}
              </div>
            )}
          </div>
        ))}
      </div>
      {!isTrash && (
        <div className={`absolute w-32 h-32 rounded-full ${color} opacity-[0.15] blur-3xl top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none`} />
      )}
    </div>
  );
};

export default ProjectPreview;

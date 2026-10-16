import { memo, useMemo } from 'react';
import { Layout } from 'lucide-react';

const LayoutTree = memo(({ nodes, connections }) => {
  // Pre-index nodes and connections for O(1) lookups and O(N + M) complexity
  const trees = useMemo(() => {
    if (!nodes || nodes.length === 0) return null;

    const nodesMap = new Map();
    for (let i = 0; i < nodes.length; i++) {
      nodesMap.set(nodes[i].id, nodes[i]);
    }

    const incomingEdges = new Set();
    const connectionsByFrom = new Map();
    for (let i = 0; i < connections.length; i++) {
      const c = connections[i];
      incomingEdges.add(c.to);
      let list = connectionsByFrom.get(c.from);
      if (!list) {
        list = [];
        connectionsByFrom.set(c.from, list);
      }
      list.push(c);
    }

    const rootNodes = nodes.filter(n => !incomingEdges.has(n.id));
    const startNodes = rootNodes.length > 0 ? rootNodes : [nodes[0]];
    const allVisited = new Set();
    
    const renderTree = (node, visitedPath = new Set()) => {
      if (!node) return null;
      
      const isVisited = visitedPath.has(node.id);
      const newVisitedPath = new Set(visitedPath).add(node.id);
      allVisited.add(node.id);
      
      const childConnections = connectionsByFrom.get(node.id) || [];
      const childNodes = childConnections.map(c => nodesMap.get(c.to)).filter(Boolean);

      return (
        <div key={`${node.id}-${visitedPath.size}`} className="relative w-max min-w-full">
          <div className="flex items-start py-1">
            <div className="text-sm font-mono whitespace-nowrap pr-2">
              {node.text ? (
                <span className="text-green-400">"{node.text}"</span>
              ) : (
                <span className="text-slate-400 italic">"{node.type}"</span>
              )}
              
              {isVisited ? (
                <span className="text-amber-500/70 text-xs ml-2 italic">[Circular]</span>
              ) : childNodes.length > 0 ? (
                <span className="text-slate-300 ml-1">:</span>
              ) : null}
            </div>
          </div>
          
          {!isVisited && childNodes.length > 0 && (
            <div className="ml-2 pl-4 border-l border-slate-600 relative">
              {childNodes.map((child, idx) => renderTree(child, newVisitedPath, idx === childNodes.length - 1))}
            </div>
          )}
        </div>
      );
    };

    const treeList = [];
    startNodes.forEach((node, idx) => {
      treeList.push(renderTree(node, new Set(), idx === startNodes.length - 1));
    });

    nodes.forEach(node => {
      if (!allVisited.has(node.id)) {
        treeList.push(renderTree(node, new Set(), true));
      }
    });

    return treeList;
  }, [nodes, connections]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="text-center text-slate-500 mt-10">
        <Layout size={40} className="mx-auto mb-4 opacity-50" />
        <p>No nodes to display.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-xl border border-slate-700 p-4 overflow-auto sidebar-scrollbar">
      <div className="text-slate-300 mb-2 font-mono text-sm w-max min-w-full">{"{"}</div>
      <div className="ml-2 pl-4 border-l border-slate-600 w-max min-w-full">
        {trees}
      </div>
      <div className="text-slate-300 mt-2 font-mono text-sm w-max min-w-full">{"}"}</div>
    </div>
  );
});

export default LayoutTree;

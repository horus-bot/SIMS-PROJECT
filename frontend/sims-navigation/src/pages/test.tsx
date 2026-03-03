import React, { useState, useRef, useEffect } from 'react';
import initialData from '../data/graphData4th.json';
import templateData from '../data/template.json';

type NodeType = 'path' | 'destination';

interface Node {
  x: number;
  y: number;
  type: NodeType;
}

interface Edge {
  from: string;
  to: string;
}

interface Destination {
  node: string;
  pic: string;
}

interface MapData {
  nodes: Record<string, Node>;
  edges: Edge[];
  destinations: Record<string, Destination>;
}

const Test: React.FC = () => {
  const [mapData, setMapData] = useState<MapData>(() => {
    const raw = initialData as any;
    // Normalize destinations: if it's an array, convert to object
    const destinations: Record<string, Destination> =
      Array.isArray(raw.destinations) ? {} : (raw.destinations || {});
    return { nodes: raw.nodes, edges: raw.edges, destinations };
  });
  const [mode, setMode] = useState<'view' | 'add_path' | 'add_destination' | 'add_edge' | 'delete'>('view');
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMap, setSelectedMap] = useState<'4th' | 'first' | 'five'>('4th');
  const lastSavedRef = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Generate next node ID (always node_XXX for both types)
  const generateNodeId = () => {
    let maxNum = 0;
    Object.keys(mapData.nodes).forEach(id => {
      const match = id.match(/^node_(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return 'node_' + String(maxNum + 1).padStart(3, '0');
  };

  // Find destination name for a given node id
  const getDestinationName = (nodeId: string): string | null => {
    for (const [name, dest] of Object.entries(mapData.destinations)) {
      if (dest.node === nodeId) return name;
    }
    return null;
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'add_path' && mode !== 'add_destination') return;
    if (!svgRef.current) return;

    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgCTM = svgRef.current.getScreenCTM();
    if (!svgCTM) return;
    const svgP = point.matrixTransform(svgCTM.inverse());

    const newId = generateNodeId();
    const x = Number(svgP.x.toFixed(1));
    const y = Number(svgP.y.toFixed(1));

    if (mode === 'add_path') {
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newId]: { x, y, type: 'path' }
        }
      }));
    } else {
      // Destination — prompt for name
      const name = window.prompt('Enter destination name (e.g. "BW204"):');
      if (!name || name.trim() === '') return; // cancelled
      const pic = window.prompt('Enter pic filename (leave empty if none):', '') || '';
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newId]: { x, y, type: 'destination' }
        },
        destinations: {
          ...prev.destinations,
          [name.trim()]: { node: newId, pic: pic.trim() }
        }
      }));
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();
    if (mode === 'add_edge') {
      if (!selectedNodeForEdge) {
        setSelectedNodeForEdge(nodeId);
      } else {
        if (selectedNodeForEdge !== nodeId) {
          const edgeExists = mapData.edges.some(
            edge =>
              (edge.from === selectedNodeForEdge && edge.to === nodeId) ||
              (edge.from === nodeId && edge.to === selectedNodeForEdge)
          );
          if (!edgeExists) {
            setMapData(prev => ({
              ...prev,
              edges: [...prev.edges, { from: selectedNodeForEdge, to: nodeId }]
            }));
          }
        }
        setSelectedNodeForEdge(null);
      }
    } else if (mode === 'delete') {
      setMapData(prev => {
        const newNodes = { ...prev.nodes };
        delete newNodes[nodeId];
        // Also remove from destinations if present
        const newDest = { ...prev.destinations };
        for (const [name, dest] of Object.entries(newDest)) {
          if (dest.node === nodeId) delete newDest[name];
        }
        return {
          ...prev,
          nodes: newNodes,
          edges: prev.edges.filter(edge => edge.from !== nodeId && edge.to !== nodeId),
          destinations: newDest
        };
      });
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeIndex: number) => {
    e.stopPropagation();
    if (mode === 'delete') {
      setMapData(prev => ({
        ...prev,
        edges: prev.edges.filter((_, i) => i !== edgeIndex)
      }));
    }
  };

  const downloadJson = () => {
    const dataStr = JSON.stringify(mapData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    // choose a filename based on selected map
    const filename = selectedMap === '4th' ? 'graphData4th.json' : selectedMap === 'first' ? 'graphData_first.json' : 'graphData_five.json';
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    // mark as saved
    lastSavedRef.current = dataStr;
    setIsDirty(false);
  };

  const saveOnly = () => {
    // same as download but keep filename
    downloadJson();
  };

  // map definitions
  const maps: Record<string, { label: string; svg: string; data: any }> = {
    '4th': { label: '4th Floor', svg: '/SIMS4th.svg', data: initialData },
    'first': { label: 'First OG', svg: '/SIMS_MAP_FIRST_OG.svg', data: templateData },
    'five': { label: 'Fifth OG', svg: '/SIMS_MAP_FIVE_OG.svg', data: templateData }
  };

  // update dirty flag when mapData changes
  useEffect(() => {
    const curr = JSON.stringify(mapData);
    setIsDirty(curr !== lastSavedRef.current);
  }, [mapData]);

  // load map data when selectedMap changes
  useEffect(() => {
    const raw = maps[selectedMap].data as any;
    const destinations: Record<string, Destination> = Array.isArray(raw.destinations) ? {} : (raw.destinations || {});
    const nodes = raw.nodes || {};
    const edges = raw.edges || [];
    const newMap: MapData = { nodes, edges, destinations };
    setMapData(newMap);
    lastSavedRef.current = JSON.stringify(newMap);
    setIsDirty(false);
  }, [selectedMap]);

  // warn on closing tab if there are unsaved changes
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  const nodeCount = Object.keys(mapData.nodes).length;
  const edgeCount = mapData.edges.length;
  const destCount = Object.keys(mapData.destinations).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>Map Playground — {maps[selectedMap].label}</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#555' }}>
          <span>Nodes: <b>{nodeCount}</b></span>
          <span>Edges: <b>{edgeCount}</b></span>
          <span>Destinations: <b>{destCount}</b></span>
          <select
            value={selectedMap}
            onChange={(e) => {
              const next = e.target.value as '4th' | 'first' | 'five';
              if (isDirty) {
                const ok = window.confirm('You have unsaved changes. OK = export/save before switching, Cancel = abort switch.');
                if (!ok) return;
                downloadJson();
              }
              setSelectedMap(next);
            }}
            style={{ padding: '6px', borderRadius: '4px' }}
          >
            <option value="4th">4th Floor</option>
            <option value="first">First OG</option>
            <option value="five">Fifth OG</option>
          </select>

          <button
            onClick={saveOnly}
            style={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold', padding: '8px 12px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontSize: '13px' }}
          >
            Save / Export
          </button>
          <button
            onClick={() => {
              const dataStr = JSON.stringify(mapData, null, 2);
              lastSavedRef.current = dataStr;
              setIsDirty(false);
              alert('Marked as saved (no export).');
            }}
            style={{ backgroundColor: '#4CAF50', color: 'white', fontWeight: 'bold', padding: '8px 12px', cursor: 'pointer', border: 'none', borderRadius: '5px', fontSize: '13px' }}
          >
            Mark Saved
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {([
          { m: 'view' as const, label: 'View', color: '#333' },
          { m: 'add_path' as const, label: 'Path Node', color: 'green' },
          { m: 'add_destination' as const, label: 'Destination', color: 'purple' },
          { m: 'add_edge' as const, label: 'Connect', color: '#1a73e8' },
          { m: 'delete' as const, label: 'Delete', color: 'red' },
        ]).map(({ m, label, color }) => (
          <button
            key={m}
            onClick={() => { setMode(m); setSelectedNodeForEdge(null); }}
            style={{
              padding: '6px 14px',
              fontSize: '13px',
              fontWeight: mode === m ? 700 : 400,
              color: mode === m ? 'white' : color,
              backgroundColor: mode === m ? color : 'white',
              border: `2px solid ${color}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Status bar */}
      <div style={{ marginBottom: '6px', height: '22px', fontSize: '13px', color: '#666' }}>
        {mode === 'view' && (hoveredNode
          ? (() => {
              const n = mapData.nodes[hoveredNode];
              const destName = n?.type === 'destination' ? getDestinationName(hoveredNode) : null;
              return `${hoveredNode} (${n?.type})${destName ? ' — "' + destName + '"' : ''} @ (${n?.x}, ${n?.y})`;
            })()
          : 'Hover over nodes to inspect.')}
        {mode === 'add_path' && 'Click on map to place a Path node.'}
        {mode === 'add_destination' && 'Click on map to place a Destination node (you will be prompted for a name).'}
        {mode === 'add_edge' && (!selectedNodeForEdge
          ? 'Click the first node.'
          : 'Selected ' + selectedNodeForEdge + ' — now click the second node to connect.')}
        {mode === 'delete' && 'Click a node or edge to remove it.'}
      </div>

      {/* Map */}
      <div style={{ position: 'relative', width: '100%', flex: 1, overflow: 'auto', border: '1px solid #ccc', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
        <div style={{ position: 'relative', width: 'max-content', display: 'inline-block' }}>
          <img
            src="/SIMS4th.svg"
            alt="Map"
            style={{ display: 'block', maxWidth: 'none', width: '1285px', height: '731px' }}
          />
          <svg
            ref={svgRef}
            onClick={handleSvgClick}
            style={{
              position: 'absolute', top: 0, left: 0,
              width: '1285px', height: '731px',
              cursor: (mode === 'add_path' || mode === 'add_destination') ? 'crosshair' : 'default'
            }}
            viewBox="0 0 1285 731"
          >
            {/* Edges */}
            {mapData.edges.map((edge, index) => {
              const fromNode = mapData.nodes[edge.from];
              const toNode = mapData.nodes[edge.to];
              if (!fromNode || !toNode) return null;
              return (
                <line
                  key={'e-' + edge.from + '-' + edge.to + '-' + index}
                  x1={fromNode.x} y1={fromNode.y}
                  x2={toNode.x} y2={toNode.y}
                  stroke={mode === 'delete' ? 'rgba(220,50,50,0.6)' : 'rgba(60,120,255,0.5)'}
                  strokeWidth={mode === 'delete' ? '6' : '1.5'}
                  onClick={(e) => handleEdgeClick(e, index)}
                  style={{ cursor: mode === 'delete' ? 'pointer' : 'default' }}
                />
              );
            })}

            {/* Nodes */}
            {Object.entries(mapData.nodes).map(([nodeId, node]) => {
              const isSelected = selectedNodeForEdge === nodeId;
              const isDest = node.type === 'destination';
              const destName = isDest ? getDestinationName(nodeId) : null;
              const baseR = isDest ? 4 : 2.5;
              const hoverR = isDest ? 7 : 5;
              const isHovered = hoveredNode === nodeId;
              return (
                <g key={nodeId}>
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isHovered ? hoverR : baseR}
                    fill={isSelected ? 'orange' : isDest ? '#9c27b0' : '#4caf50'}
                    stroke={isSelected ? '#333' : 'white'}
                    strokeWidth="1"
                    onClick={(e) => handleNodeClick(e, nodeId)}
                    onMouseEnter={() => setHoveredNode(nodeId)}
                    onMouseLeave={() => setHoveredNode(null)}
                    style={{ cursor: mode !== 'view' ? 'pointer' : 'default' }}
                  />
                  {isDest && destName && (
                    <text
                      x={node.x}
                      y={node.y - (isHovered ? hoverR + 3 : baseR + 3)}
                      textAnchor="middle"
                      fontSize="6"
                      fill="#9c27b0"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {destName}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Test;

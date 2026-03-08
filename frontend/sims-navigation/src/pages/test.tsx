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
    const destinations: Record<string, Destination> =
      Array.isArray(raw.destinations) ? {} : (raw.destinations || {});
    return { nodes: raw.nodes, edges: raw.edges, destinations };
  });

  const [mode, setMode] = useState<'view' | 'add_path' | 'add_destination' | 'add_edge' | 'delete'>('view');
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMap, setSelectedMap] = useState<'4th' | 'first' | 'five'>('4th');
  const lastSavedRef = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'v': setMode('view'); break;
        case 'n': setMode('add_path'); break;
        case 'e': setMode('add_edge'); break;
        case 'd': setMode('delete'); break;
        case 's': saveOnly(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapData]);

  const getSvgCoords = (e: React.MouseEvent | MouseEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const point = svgRef.current.createSVGPoint();
    point.x = e.clientX;
    point.y = e.clientY;
    const svgCTM = svgRef.current.getScreenCTM();
    if (!svgCTM) return { x: 0, y: 0 };
    const svgP = point.matrixTransform(svgCTM.inverse());
    return { x: Number(svgP.x.toFixed(1)), y: Number(svgP.y.toFixed(1)) };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getSvgCoords(e);
    setMousePos(coords);

    if (draggedNode && mode === 'view') {
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [draggedNode]: { ...prev.nodes[draggedNode], x: coords.x, y: coords.y }
        }
      }));
    }
  };

  const handleMouseUp = () => {
    setDraggedNode(null);
  };

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

  const getDestinationName = (nodeId: string): string | null => {
    for (const [name, dest] of Object.entries(mapData.destinations)) {
      if (dest.node === nodeId) return name;
    }
    return null;
  };

  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (mode !== 'add_path' && mode !== 'add_destination') return;
    const { x, y } = getSvgCoords(e);
    const newId = generateNodeId();

    if (mode === 'add_path') {
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newId]: { x, y, type: 'path' }
        }
      }));
    } else {
      const name = window.prompt('Enter destination name (e.g. "BW204"):');
      if (!name || name.trim() === '') return;

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
    }

    else if (mode === 'delete') {
      setMapData(prev => {
        const newNodes = { ...prev.nodes };
        delete newNodes[nodeId];

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

    const filename =
      selectedMap === '4th'
        ? 'graphData4th.json'
        : selectedMap === 'first'
        ? 'graphData_first.json'
        : 'graphData_five.json';

    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);

    lastSavedRef.current = dataStr;
    setIsDirty(false);
  };

  const saveOnly = () => {
    downloadJson();
  };

  const maps: Record<string, { label: string; svg: string; data: any }> = {
    '4th': { label: '4th Floor', svg: '/SIMS_MAP_fourth_3200D_line.svg', data: initialData },
    'first': { label: 'First OG', svg: '/SIMS_MAP_FIRST_OG.svg', data: templateData },
    'five': { label: 'Fifth OG', svg: '/SIMS_MAP_FIVE_OG.svg', data: templateData }
  };

  useEffect(() => {
    const curr = JSON.stringify(mapData);
    setIsDirty(curr !== lastSavedRef.current);
  }, [mapData]);

  useEffect(() => {
    const raw = maps[selectedMap].data as any;

    const destinations: Record<string, Destination> =
      Array.isArray(raw.destinations) ? {} : (raw.destinations || {});

    const nodes = raw.nodes || {};
    const edges = raw.edges || [];

    const newMap: MapData = { nodes, edges, destinations };

    setMapData(newMap);

    lastSavedRef.current = JSON.stringify(newMap);
    setIsDirty(false);

  }, [selectedMap]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0 }}>Map Playground — {maps[selectedMap].label}</h2>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: '#555' }}>

          <span>Nodes: <b>{nodeCount}</b></span>
          <span>Edges: <b>{edgeCount}</b></span>
          <span>Destinations: <b>{destCount}</b></span>

          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value as any)}
            style={{ padding: '6px', borderRadius: '4px' }}
          >
            <option value="4th">4th Floor</option>
            <option value="first">First OG</option>
            <option value="five">Fifth OG</option>
          </select>

          <button
            onClick={saveOnly}
            style={{ backgroundColor: '#1976d2', color: 'white', fontWeight: 'bold', padding: '8px 12px', border: 'none', borderRadius: '5px' }}
          >
            Save / Export
          </button>

        </div>
      </div>

      {/* TOOLBAR: mode controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <button onClick={() => setMode('view')} style={{ padding: 8, borderRadius: 6, background: mode === 'view' ? '#111827' : '#f3f4f6', color: mode === 'view' ? 'white' : '#111827' }}>View</button>
        <button onClick={() => setMode('add_path')} style={{ padding: 8, borderRadius: 6, background: mode === 'add_path' ? '#111827' : '#f3f4f6', color: mode === 'add_path' ? 'white' : '#111827' }}>Add Node</button>
        <button onClick={() => setMode('add_edge')} style={{ padding: 8, borderRadius: 6, background: mode === 'add_edge' ? '#111827' : '#f3f4f6', color: mode === 'add_edge' ? 'white' : '#111827' }}>Add Edge</button>
        <button onClick={() => setMode('add_destination')} style={{ padding: 8, borderRadius: 6, background: mode === 'add_destination' ? '#111827' : '#f3f4f6', color: mode === 'add_destination' ? 'white' : '#111827' }}>Add Destination</button>
        <button onClick={() => setMode('delete')} style={{ padding: 8, borderRadius: 6, background: mode === 'delete' ? '#ef4444' : '#f3f4f6', color: mode === 'delete' ? 'white' : '#111827' }}>Delete</button>

        <div style={{ marginLeft: 12, color: '#374151', fontSize: 13 }}>
          Mode: <b>{mode}</b>
          {mode === 'add_edge' && selectedNodeForEdge && <span style={{ marginLeft: 8 }}>• selecting from <code>{selectedNodeForEdge}</code></span>}
        </div>
      </div>

      <div style={{ position: 'relative', width: '100%', flex: 1, overflow: 'auto', border: '1px solid #ccc', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>

        <div style={{ position: 'relative', width: 'max-content', display: 'inline-block' }}>

          <img
            src={maps[selectedMap].svg}
            alt="Map"
            style={{ display: 'block', maxWidth: 'none', width: '1285px', height: '731px' }}
          />

          <svg
            ref={svgRef}
            onClick={handleSvgClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '1285px',
              height: '731px'
            }}
            viewBox="0 0 1285 731"
          >
            {/* Edge Ghosting */}
            {mode === 'add_edge' && selectedNodeForEdge && mapData.nodes[selectedNodeForEdge] && (
              <line
                x1={mapData.nodes[selectedNodeForEdge].x}
                y1={mapData.nodes[selectedNodeForEdge].y}
                x2={mousePos.x}
                y2={mousePos.y}
                stroke="rgba(60,120,255,0.3)"
                strokeWidth={2}
                strokeDasharray="4 2"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {mapData.edges.map((edge, index) => {
              const fromNode = mapData.nodes[edge.from];
              const toNode = mapData.nodes[edge.to];
              if (!fromNode || !toNode) return null;

                return (
                  <line
                    key={index}
                    x1={fromNode.x}
                    y1={fromNode.y}
                    x2={toNode.x}
                    y2={toNode.y}
                    stroke={mode === 'delete' ? 'rgba(239,68,68,0.8)' : 'rgba(60,120,255,0.5)'}
                    strokeWidth={mode === 'delete' ? 3 : 1.5}
                    style={{ cursor: mode === 'delete' ? 'pointer' : mode === 'add_edge' ? 'crosshair' : 'default' }}
                    onClick={(e) => handleEdgeClick(e, index)}
                  />
                );
            })}

            {Object.entries(mapData.nodes).map(([nodeId, node]) => {
              const isDest = node.type === 'destination';
              const destName = isDest ? getDestinationName(nodeId) : null;

                return (
                  <g key={nodeId}>

                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={isDest ? (hoveredNode === nodeId ? 7 : 5) : (hoveredNode === nodeId ? 5 : 3.5)}
                      fill={isDest ? '#9c27b0' : '#4caf50'}
                      stroke={selectedNodeForEdge === nodeId || draggedNode === nodeId ? '#111827' : 'white'}
                      strokeWidth={selectedNodeForEdge === nodeId || draggedNode === nodeId ? 2 : 1}
                      onMouseDown={(e) => {
                        if (mode === 'view') {
                          e.stopPropagation();
                          setDraggedNode(nodeId);
                        }
                      }}
                      onClick={(e) => handleNodeClick(e, nodeId)}
                      onMouseEnter={() => setHoveredNode(nodeId)}
                      onMouseLeave={() => setHoveredNode(null)}
                      style={{ 
                        cursor: mode === 'delete' ? 'pointer' : 
                               mode === 'add_edge' ? 'crosshair' : 
                               mode === 'view' ? 'grab' : 'default',
                        transition: 'r 0.1s ease-out'
                      }}
                    />

                    {isDest && destName && (
                      <text
                        x={node.x}
                        y={node.y - 8}
                        textAnchor="middle"
                        fontSize="6"
                        fill="#9c27b0"
                        fontWeight="bold"
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
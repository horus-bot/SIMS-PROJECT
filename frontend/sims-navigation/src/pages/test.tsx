import React, { useState, useRef, useEffect } from 'react';
import initialData from '../data/graphData4th.json';
import templateData from '../data/template.json';
import { findShortestPath } from '../utils/pathfinding';

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

  const [mode, setMode] = useState<'view' | 'add_path' | 'add_destination' | 'add_edge' | 'delete' | 'simulate'>('view');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [simNodes, setSimNodes] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [simPath, setSimPath] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedMap, setSelectedMap] = useState<'4th' | 'first' | 'five'>('4th');
  const lastSavedRef = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('synced');

  const STORAGE_KEY = `sims_map_draft_${selectedMap}`;

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      switch (e.key.toLowerCase()) {
        case 'v': setMode('view'); break;
        case 'n': setMode('add_path'); break;
        case 'e': setMode('add_edge'); break;
        case 'd': setMode('delete'); break;
        case 't': setMode('simulate'); break;
        case 's': saveOnly(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mapData]);

  // Auto-save to Local Storage
  useEffect(() => {
    const curr = JSON.stringify(mapData);
    const isDifferent = curr !== lastSavedRef.current;
    setIsDirty(isDifferent);

    if (isDifferent) {
      setSaveStatus('saving');
      const timer = setTimeout(() => {
        localStorage.setItem(STORAGE_KEY, curr);
        setSaveStatus('saved');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapData, STORAGE_KEY]);

  // Calculate simulated path
  useEffect(() => {
    if (mode === 'simulate' && simNodes.start && simNodes.end) {
      // Create graph weight map from edges
      const graph: Record<string, { node: string; weight: number }[]> = {};
      mapData.edges.forEach(edge => {
        const n1 = mapData.nodes[edge.from];
        const n2 = mapData.nodes[edge.to];
        if (!n1 || !n2) return;
        const dist = Math.sqrt(Math.pow(n1.x - n2.x, 2) + Math.pow(n1.y - n2.y, 2));
        
        if (!graph[edge.from]) graph[edge.from] = [];
        if (!graph[edge.to]) graph[edge.to] = [];
        graph[edge.from].push({ node: edge.to, weight: dist });
        graph[edge.to].push({ node: edge.from, weight: dist });
      });

      const path = findShortestPath(simNodes.start, simNodes.end, mapData.nodes, graph);
      setSimPath(path);
    } else {
      setSimPath([]);
    }
  }, [simNodes, mode]);

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

    if (mode === 'view') {
      setSelectedNodeId(nodeId);
    }

    else if (mode === 'simulate') {
      setSimNodes(prev => {
        if (!prev.start || (prev.start && prev.end)) {
          return { start: nodeId, end: null };
        } else {
          return { ...prev, end: nodeId };
        }
      });
    }

    else if (mode === 'add_edge') {
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
    const saved = localStorage.getItem(STORAGE_KEY);
    let raw: any;
    
    if (saved) {
      try {
        raw = JSON.parse(saved);
        setSaveStatus('saved');
      } catch (e) {
        raw = maps[selectedMap].data;
      }
    } else {
      raw = maps[selectedMap].data;
      setSaveStatus('synced');
    }

    const destinations: Record<string, Destination> =
      Array.isArray(raw.destinations) ? {} : (raw.destinations || {});

    const nodes = raw.nodes || {};
    const edges = raw.edges || [];

    const newMap: MapData = { nodes, edges, destinations };
    setMapData(newMap);
    lastSavedRef.current = JSON.stringify(newMap);
  }, [selectedMap]);

  const restoreOriginal = () => {
    if (!window.confirm('Discard all local changes for this floor and restore from original JSON?')) return;
    localStorage.removeItem(STORAGE_KEY);
    const raw = maps[selectedMap].data as any;
    const destinations: Record<string, Destination> = Array.isArray(raw.destinations) ? {} : (raw.destinations || {});
    const newMap = { nodes: raw.nodes, edges: raw.edges, destinations };
    setMapData(newMap);
    lastSavedRef.current = JSON.stringify(newMap);
    setSaveStatus('synced');
  };

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

  const handleUpdateNode = (nodeId: string, updates: Partial<Node>) => {
    setMapData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], ...updates }
      }
    }));
  };

  const handleUpdateDestination = (nodeId: string, name: string, pic: string) => {
    setMapData(prev => {
      const newDestinations = { ...prev.destinations };
      // Remove old destination entry for this node
      for (const key in newDestinations) {
        if (newDestinations[key].node === nodeId) {
          delete newDestinations[key];
        }
      }
      // Add new one
      if (name) {
        newDestinations[name] = { node: nodeId, pic };
      }
      return { ...prev, destinations: newDestinations };
    });
  };

  const deleteNode = (nodeId: string) => {
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
    setSelectedNodeId(null);
  };

  const nodeCount = Object.keys(mapData.nodes).length;
  const edgeCount = mapData.edges.length;
  const destCount = Object.keys(mapData.destinations).length;

  const selectedNode = selectedNodeId ? mapData.nodes[selectedNodeId] : null;
  const selectedDestName = selectedNodeId ? getDestinationName(selectedNodeId) : null;
  const selectedDestPic = selectedDestName ? mapData.destinations[selectedDestName].pic : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '16px', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', backgroundColor: '#f9fafb' }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'white', padding: '12px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#111827' }}>Map Playground — {maps[selectedMap].label}</h2>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '13px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px', background: '#f3f4f6', borderRadius: '8px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: saveStatus === 'saving' ? '#f59e0b' : saveStatus === 'saved' ? '#10b981' : '#9ca3af' }} />
            <span style={{ color: '#4b5563', fontWeight: 500 }}>
              {saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Draft Saved' : 'Synced'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', color: '#6b7280', borderLeft: '1px solid #e5e7eb', paddingLeft: '16px' }}>
            <span>Nodes: <b>{nodeCount}</b></span>
            <span>Edges: <b>{edgeCount}</b></span>
          </div>

          <select
            value={selectedMap}
            onChange={(e) => setSelectedMap(e.target.value as any)}
            style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', outline: 'none', cursor: 'pointer' }}
          >
            <option value="4th">4th Floor</option>
            <option value="first">First OG</option>
            <option value="five">Fifth OG</option>
          </select>

          <button onClick={restoreOriginal} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 500 }}>Restore</button>
          <button onClick={saveOnly} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600 }}>Export JSON</button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        
        {/* MAIN EDITOR AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          
          {/* TOOLBAR */}
          <div style={{ display: 'flex', gap: 8, padding: '12px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb' }}>
            <button onClick={() => setMode('view')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'view' ? '#111827' : 'white', color: mode === 'view' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>View (V)</button>
            <button onClick={() => setMode('add_path')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'add_path' ? '#111827' : 'white', color: mode === 'add_path' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Node (N)</button>
            <button onClick={() => setMode('add_edge')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'add_edge' ? '#111827' : 'white', color: mode === 'add_edge' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Edge (E)</button>
            <button onClick={() => setMode('add_destination')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'add_destination' ? '#111827' : 'white', color: mode === 'add_destination' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>+ Dest</button>
            <button onClick={() => setMode('simulate')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'simulate' ? '#f59e0b' : 'white', color: mode === 'simulate' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Test Path (T)</button>
            <button onClick={() => setMode('delete')} style={{ padding: '8px 12px', borderRadius: '6px', border: 'none', background: mode === 'delete' ? '#ef4444' : 'white', color: mode === 'delete' ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 500, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>Delete (D)</button>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', fontSize: '13px' }}>
              {mode === 'add_edge' && selectedNodeForEdge && <span>Connecting <code>{selectedNodeForEdge}</code>...</span>}
              {mode === 'simulate' && (
                <span>{simNodes.start ? `From ${simNodes.start}` : 'Select start'} {simNodes.end ? `to ${simNodes.end}` : simNodes.start ? '• Select end' : ''}</span>
              )}
            </div>
          </div>

          {/* MAP CANVAS */}
          <div style={{ position: 'relative', flex: 1, overflow: 'auto', background: '#f3f4f6' }}>
            <div style={{ position: 'relative', width: 'max-content', margin: '20px' }}>
              <img src={maps[selectedMap].svg} alt="Map" style={{ display: 'block', width: '1285px', height: '731px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <svg
                ref={svgRef}
                onClick={handleSvgClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ position: 'absolute', top: 0, left: 0, width: '1285px', height: '731px' }}
                viewBox="0 0 1285 731"
              >
                {/* Simulation Path */}
                {simPath.length > 1 && (
                  <g>
                    {simPath.map((nodeId, idx) => {
                      if (idx === 0) return null;
                      const n1 = mapData.nodes[simPath[idx - 1]];
                      const n2 = mapData.nodes[nodeId];
                      if (!n1 || !n2) return null;
                      return <line key={`sim-${idx}`} x1={n1.x} y1={n1.y} x2={n2.x} y2={n2.y} stroke="#f59e0b" strokeWidth={5} strokeLinecap="round" opacity={0.7} />;
                    })}
                  </g>
                )}

                {/* Ghost Line */}
                {mode === 'add_edge' && selectedNodeForEdge && mapData.nodes[selectedNodeForEdge] && (
                  <line x1={mapData.nodes[selectedNodeForEdge].x} y1={mapData.nodes[selectedNodeForEdge].y} x2={mousePos.x} y2={mousePos.y} stroke="#2563eb" strokeWidth={2} strokeDasharray="5 3" opacity={0.5} />
                )}

                {/* Edges */}
                {mapData.edges.map((edge, index) => {
                  const fromNode = mapData.nodes[edge.from];
                  const toNode = mapData.nodes[edge.to];
                  if (!fromNode || !toNode) return null;
                  return (
                    <line key={index} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y} 
                      stroke={mode === 'delete' ? '#ef4444' : '#3b82f6'} 
                      strokeWidth={mode === 'delete' ? 3 : 1.5} 
                      opacity={0.4} 
                      style={{ cursor: mode === 'delete' ? 'pointer' : 'default' }}
                      onClick={(e) => handleEdgeClick(e, index)}
                    />
                  );
                })}

                {/* Nodes */}
                {Object.entries(mapData.nodes).map(([nodeId, node]) => {
                  const isDest = node.type === 'destination';
                  const isSelected = selectedNodeId === nodeId;
                  const name = getDestinationName(nodeId);

                  return (
                    <g key={nodeId}>
                      <circle
                        cx={node.x} cy={node.y}
                        r={isSelected ? 8 : (hoveredNode === nodeId ? 6 : (isDest ? 5 : 3.5))}
                        fill={isDest ? '#a855f7' : '#10b981'}
                        stroke={isSelected ? '#111827' : 'white'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        onMouseDown={(e) => { if (mode === 'view') { e.stopPropagation(); setDraggedNode(nodeId); } }}
                        onClick={(e) => handleNodeClick(e, nodeId)}
                        onMouseEnter={() => setHoveredNode(nodeId)}
                        onMouseLeave={() => setHoveredNode(null)}
                        style={{ cursor: mode === 'delete' ? 'pointer' : (mode === 'view' ? 'grab' : 'crosshair'), transition: 'r 0.15s ease' }}
                      />
                      {isDest && name && (
                        <text x={node.x} y={node.y - 10} textAnchor="middle" fontSize="10" fill="#7e22ce" fontWeight="bold" style={{ pointerEvents: 'none', userSelect: 'none' }}>{name}</text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>

        {/* SIDE PANEL */}
        <div style={{ width: '320px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid #f3f4f6' }}>
            <h3 style={{ margin: 0, fontSize: '1rem', color: '#111827' }}>Properties</h3>
          </div>

          <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
            {selectedNodeId && selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>Node ID</label>
                  <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'block' }}>{selectedNodeId}</code>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>X Coord</label>
                    <input type="number" value={selectedNode.x} onChange={(e) => handleUpdateNode(selectedNodeId, { x: Number(e.target.value) })} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Y Coord</label>
                    <input type="number" value={selectedNode.y} onChange={(e) => handleUpdateNode(selectedNodeId, { y: Number(e.target.value) })} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Type</label>
                  <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                    <button onClick={() => handleUpdateNode(selectedNodeId, { type: 'path' })} 
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: selectedNode.type === 'path' ? 'white' : 'transparent', color: selectedNode.type === 'path' ? '#111827' : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: selectedNode.type === 'path' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Path</button>
                    <button onClick={() => handleUpdateNode(selectedNodeId, { type: 'destination' })} 
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: selectedNode.type === 'destination' ? 'white' : 'transparent', color: selectedNode.type === 'destination' ? '#111827' : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: selectedNode.type === 'destination' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Dest</button>
                  </div>
                </div>

                {selectedNode.type === 'destination' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #f3e8ff' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7e22ce', marginBottom: '4px' }}>Display Name</label>
                      <input type="text" value={selectedDestName || ''} onChange={(e) => handleUpdateDestination(selectedNodeId, e.target.value, selectedDestPic)} placeholder="e.g. B204"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '14px', outlineColor: '#a855f7' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7e22ce', marginBottom: '4px' }}>Photo Filename</label>
                      <input type="text" value={selectedDestPic || ''} onChange={(e) => handleUpdateDestination(selectedNodeId, selectedDestName || '', e.target.value)} placeholder="e.g. B204.jpeg"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '14px', outlineColor: '#a855f7' }} />
                    </div>
                  </div>
                )}

                <button onClick={() => deleteNode(selectedNodeId)} style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>Delete Node</button>

              </div>
            ) : (
              <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', textAlign: 'center' }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
                <p style={{ marginTop: '12px', fontSize: '14px' }}>Select a node on the map<br/>to edit its properties</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};

export default Test;
import React, { useState, useRef, useEffect } from 'react';
import initialData from '../data/graphData4th.json';
import templateData from '../data/template.json';
import firstfloorData from '../data/graphData_firstfloor.json';
import fifthFloorData from '../data/graphData_5th.json';
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
  const [selectedMap, setSelectedMap] = useState<'4th' | 'first' | 'five' | 'firstfloor' | '5th'>('4th');

  const maps: Record<string, { label: string; svg: string; data: any }> = {
    '4th': { label: '4th Floor', svg: '/SIMS_MAP_fourth_3200D_line.svg', data: initialData },
    'first': { label: 'First OG', svg: '/SIMS_MAP_FIRST_OG.svg', data: templateData },
    'five': { label: 'Fifth OG', svg: '/SIMS_MAP_FIVE_OG.svg', data: templateData },
    'firstfloor': { label: 'First Floor', svg: '/firstfloor.svg', data: firstfloorData },
    '5th': { label: '5th Floor', svg: '/5th_floor.svg', data: fifthFloorData }
  };

  const [mapData, setMapData] = useState<MapData>(() => {
    const raw = initialData as any;
    const destinations: Record<string, Destination> =
      Array.isArray(raw.destinations) ? {} : (raw.destinations || {});
    return { nodes: raw.nodes, edges: raw.edges, destinations };
  });

  const [mode, setMode] = useState<'view' | 'add_path' | 'add_destination' | 'add_edge' | 'add_line' | 'delete' | 'simulate'>('view');
  const [lineStartPos, setLineStartPos] = useState<{ x: number, y: number, id: string } | null>(null);
  const [selectedNodes, setSelectedNodes] = useState<string[]>([]);
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [selectedNodeForEdge, setSelectedNodeForEdge] = useState<string | null>(null);
  const [simNodes, setSimNodes] = useState<{ start: string | null; end: string | null }>({ start: null, end: null });
  const [simPath, setSimPath] = useState<string[]>([]);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const lastSavedRef = useRef<string>('');
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'synced'>('synced');

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [dimensions, setDimensions] = useState({ width: 1285, height: 731 });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = maps[selectedMap].svg;
  }, [selectedMap, maps]);

  const [past, setPast] = useState<MapData[]>([]);
  const [future, setFuture] = useState<MapData[]>([]);
  const dragStartStateRef = useRef<MapData | null>(null);
  const dragStartMousePosRef = useRef<{x: number, y: number} | null>(null);
  const wasDraggingRef = useRef(false);

  const STORAGE_KEY = `sims_map_draft_${selectedMap}`;

  const takeSnapshot = () => {
    setPast(prev => [...prev.slice(-29), mapData]); // Keep last 30 steps
    setFuture([]);
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setFuture(prev => [mapData, ...prev]);
    setPast(prev => prev.slice(0, prev.length - 1));
    setMapData(previous);
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setPast(prev => [...prev, mapData]);
    setFuture(prev => prev.slice(1));
    setMapData(next);
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
          if (selectedNodes.length > 0 && mode === 'view') {
             e.preventDefault();
             deleteNodes(selectedNodes);
             return;
          }
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      switch (e.key.toLowerCase()) {
        case 'v': setMode('view'); break;
        case 'n': setMode('add_path'); break;
        case 'e': setMode('add_edge'); break;
        case 'l': setMode('add_line'); break;
        case 'm': setMode('add_destination'); break;
        case 'd': setMode('delete'); break;
        case 't': setMode('simulate'); break;
        case 's': saveOnly(); break;
        case '0': setTransform({ x: 0, y: 0, scale: 1 }); break;
      }

      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
    };
    
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [mapData, past, future, selectedNodes, mode]);

  useEffect(() => {
    if (mode !== 'add_line') {
      setLineStartPos(null);
    }
  }, [mode]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheelNative = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      } else {
        // Stop bubbling so the rest of the page isn't scrolled if not intended
        e.preventDefault();
      }
      
      const scaleFactor = 1.1;
      const delta = e.deltaY < 0 ? scaleFactor : 1 / scaleFactor;
      
      setTransform(prev => {
        const newScale = Math.min(Math.max(prev.scale * delta, 0.2), 10);
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const newX = mouseX - (mouseX - prev.x) * delta;
        const newY = mouseY - (mouseY - prev.y) * delta;

        return { x: newX, y: newY, scale: newScale };
      });
    };

    container.addEventListener('wheel', handleWheelNative, { passive: false });
    return () => container.removeEventListener('wheel', handleWheelNative);
  }, []);

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
      const path = findShortestPath(simNodes.start, simNodes.end, mapData.nodes, mapData.edges);
      setSimPath(path);
    } else {
      setSimPath([]);
    }
  }, [simNodes, mode, mapData.nodes, mapData.edges]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    wasDraggingRef.current = false;
    if (e.button === 1 || e.button === 2 || (e.button === 0 && isSpacePressed)) {
      e.preventDefault();
      setIsPanning(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
      return;
    }

    if (mode === 'view' && !draggedNode && e.button === 0) {
      const coords = getSvgCoords(e);
      setSelectionBox({startX: coords.x, startY: coords.y, endX: coords.x, endY: coords.y});
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const coords = getSvgCoords(e);
    setMousePos(coords);

    if (!wasDraggingRef.current && (Math.abs(e.clientX - lastMousePos.x) > 3 || Math.abs(e.clientY - lastMousePos.y) > 3)) {
      wasDraggingRef.current = true;
    }

    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev!, endX: coords.x, endY: coords.y }));
    } else if (draggedNode && mode === 'view' && dragStartStateRef.current && dragStartMousePosRef.current) {
      const startState = dragStartStateRef.current;
      const dx = coords.x - dragStartMousePosRef.current.x;
      const dy = coords.y - dragStartMousePosRef.current.y;
      
      const nodesToMove = selectedNodes.includes(draggedNode) ? selectedNodes : [draggedNode];
        
        setMapData(prev => {
          const newNodes = { ...prev.nodes };
          nodesToMove.forEach(id => {
            const initialNode = startState.nodes[id];
            if (initialNode) {
              newNodes[id] = { ...initialNode, x: Number((initialNode.x + dx).toFixed(1)), y: Number((initialNode.y + dy).toFixed(1)) };
            }
          });
          return { ...prev, nodes: newNodes };
        });
    } else if (isPanning) {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (selectionBox) {
       if (wasDraggingRef.current) {
         const minX = Math.min(selectionBox.startX, selectionBox.endX);
         const maxX = Math.max(selectionBox.startX, selectionBox.endX);
         const minY = Math.min(selectionBox.startY, selectionBox.endY);
         const maxY = Math.max(selectionBox.startY, selectionBox.endY);
         
         const selected = Object.entries(mapData.nodes).filter(([_, node]) => {
            return node.x >= minX && node.x <= maxX && node.y >= minY && node.y <= maxY;
         }).map(([id]) => id);
  
         if (e.shiftKey && !e.ctrlKey) {
             setSelectedNodes(prev => Array.from(new Set([...prev, ...selected])));
         } else {
             setSelectedNodes(selected);
         }
       }
       setSelectionBox(null);
    }
    
    if (draggedNode && dragStartStateRef.current && wasDraggingRef.current) {
      const stateToSave = dragStartStateRef.current;
      setPast(prev => [...prev.slice(-29), stateToSave]);
      setFuture([]);
    }
    setDraggedNode(null);
    setIsPanning(false);
    dragStartStateRef.current = null;
    dragStartMousePosRef.current = null;
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
    if (mode === 'view') {
      if (!e.shiftKey && !wasDraggingRef.current) setSelectedNodes([]);
      return;
    }
    if (mode !== 'add_path' && mode !== 'add_destination' && mode !== 'add_line') return;
    
    takeSnapshot();
    const { x, y } = getSvgCoords(e);
    const newId = generateNodeId();

    if (mode === 'add_line') {
      const pxSpacing = 40; // Generate a dot every 40 pixels
      let currentNodes = { ...mapData.nodes };
      let currentEdges = [ ...mapData.edges ];

      if (!lineStartPos) {
        currentNodes[newId] = { x, y, type: 'path' };
        setMapData(prev => ({ ...prev, nodes: currentNodes }));
        setLineStartPos({ x, y, id: newId });
      } else {
        const dist = Math.hypot(x - lineStartPos.x, y - lineStartPos.y);
        const steps = Math.floor(dist / pxSpacing);
        
        let prevId = lineStartPos.id;
        let maxNum = 0;
        
        Object.keys(currentNodes).forEach(idArg => {
          const match = idArg.match(/^node_(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });

        for (let i = 1; i <= steps; i++) {
          const ratio = i / steps;
          const currX = Number((lineStartPos.x + ratio * (x - lineStartPos.x)).toFixed(1));
          const currY = Number((lineStartPos.y + ratio * (y - lineStartPos.y)).toFixed(1));
          
          maxNum++;
          const generatedId = 'node_' + String(maxNum).padStart(3, '0');
          currentNodes[generatedId] = { x: currX, y: currY, type: 'path' };
          
          currentEdges.push({ from: prevId, to: generatedId });
          prevId = generatedId;
        }

        setMapData(prev => ({ ...prev, nodes: currentNodes, edges: currentEdges }));
        setLineStartPos({ x, y, id: prevId }); // Ready for continuous drawing
      }
      return;
    }

    if (mode === 'add_path') {
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newId]: { x, y, type: 'path' }
        }
      }));
    } else {
      // Prompt-free: Create node and select it immediately for sidebar editing
      setMapData(prev => ({
        ...prev,
        nodes: {
          ...prev.nodes,
          [newId]: { x, y, type: 'destination' }
        }
      }));
      setSelectedNodes([newId]);
      setMode('view'); // Switch to view so they can edit immediately
    }
  };

  const handleNodeClick = (e: React.MouseEvent, nodeId: string) => {
    e.stopPropagation();

    if (mode === 'view') {
      if (wasDraggingRef.current) return;
      if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
        setSelectedNodes([nodeId]);
      }
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

    else if (mode === 'add_line') {
      takeSnapshot();
      if (!lineStartPos) {
        setLineStartPos({ x: mapData.nodes[nodeId].x, y: mapData.nodes[nodeId].y, id: nodeId });
      } else {
        const targetNode = mapData.nodes[nodeId];
        const dist = Math.hypot(targetNode.x - lineStartPos.x, targetNode.y - lineStartPos.y);
        const pxSpacing = 40;
        const steps = Math.floor(dist / pxSpacing);
        
        let currentNodes = { ...mapData.nodes };
        let currentEdges = [ ...mapData.edges ];
        let prevId = lineStartPos.id;
        
        let maxNum = 0;
        Object.keys(currentNodes).forEach(idArg => {
          const match = idArg.match(/^node_(\d+)$/);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        
        for (let i = 1; i < steps; i++) {
          const ratio = i / steps;
          const currX = Number((lineStartPos.x + ratio * (targetNode.x - lineStartPos.x)).toFixed(1));
          const currY = Number((lineStartPos.y + ratio * (targetNode.y - lineStartPos.y)).toFixed(1));
          
          maxNum++;
          const generatedId = 'node_' + String(maxNum).padStart(3, '0');
          currentNodes[generatedId] = { x: currX, y: currY, type: 'path' };
          
          currentEdges.push({ from: prevId, to: generatedId });
          prevId = generatedId;
        }
        
        // Final edge link connecting to the specifically clicked node
        const edgeExists = currentEdges.some(
          edge => (edge.from === prevId && edge.to === nodeId) || (edge.from === nodeId && edge.to === prevId)
        );
        if (!edgeExists && prevId !== nodeId) {
          currentEdges.push({ from: prevId, to: nodeId });
        }
        
        setMapData(prev => ({ ...prev, nodes: currentNodes, edges: currentEdges }));
        setLineStartPos({ x: targetNode.x, y: targetNode.y, id: nodeId });
      }
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
            takeSnapshot();
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
      deleteNodes([nodeId]);
    }
  };

  const handleEdgeClick = (e: React.MouseEvent, edgeIndex: number) => {
    e.stopPropagation();

    if (mode === 'delete') {
      takeSnapshot();
      setMapData(prev => ({
        ...prev,
        edges: prev.edges.filter((_, i) => i !== edgeIndex)
      }));
    } else if (mode === 'view' || mode === 'add_path' || mode === 'add_line') {
      takeSnapshot();
      const coords = getSvgCoords(e);
      
      let maxNum = 0;
      Object.keys(mapData.nodes).forEach(idArg => {
        const match = idArg.match(/^node_(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      });
      const newId = 'node_' + String(maxNum + 1).padStart(3, '0');
      
      setMapData(prev => {
        const edge = prev.edges[edgeIndex];
        const newEdges = [...prev.edges];
        newEdges.splice(edgeIndex, 1);
        newEdges.push({ from: edge.from, to: newId });
        newEdges.push({ from: newId, to: edge.to });
        return {
          ...prev,
          nodes: { ...prev.nodes, [newId]: { x: coords.x, y: coords.y, type: 'path' } },
          edges: newEdges
        };
      });
      setSelectedNodes([newId]);
    }
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
    takeSnapshot();
    setMapData(prev => ({
      ...prev,
      nodes: {
        ...prev.nodes,
        [nodeId]: { ...prev.nodes[nodeId], ...updates }
      }
    }));
  };

  const handleUpdateDestination = (nodeId: string, name: string, pic: string) => {
    takeSnapshot();
    setMapData(prev => {
      const newDestinations = { ...prev.destinations };
      for (const key in newDestinations) {
        if (newDestinations[key].node === nodeId) {
          delete newDestinations[key];
        }
      }
      if (name) {
        newDestinations[name] = { node: nodeId, pic };
      }
      return { ...prev, destinations: newDestinations };
    });
  };

  const deleteNodes = (nodeIds: string[]) => {
    takeSnapshot();
    setMapData(prev => {
      const newNodes = { ...prev.nodes };
      nodeIds.forEach(id => delete newNodes[id]);
      const newDest = { ...prev.destinations };
      for (const [name, dest] of Object.entries(newDest)) {
        if (nodeIds.includes(dest.node)) delete newDest[name];
      }
      return {
        ...prev,
        nodes: newNodes,
        edges: prev.edges.filter(edge => !nodeIds.includes(edge.from) && !nodeIds.includes(edge.to)),
        destinations: newDest
      };
    });
    setSelectedNodes(prev => prev.filter(id => !nodeIds.includes(id)));
  };

  const nodeCount = Object.keys(mapData.nodes).length;
  const edgeCount = mapData.edges.length;

  const downloadJson = () => {
    // Merge back the original meta details implicitly expected by MapView graph data!
    const exportData = {
      meta: maps[selectedMap].data.meta || { building: "SIMS", floor: selectedMap, svg: maps[selectedMap].svg },
      ...mapData
    };
    
    const dataStr = JSON.stringify(exportData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;

    const filename =
      selectedMap === '4th'
        ? 'graphData4th.json'
        : selectedMap === 'first'
        ? 'graphData_first.json'
        : selectedMap === 'five'
        ? 'graphData_five.json'
        : selectedMap === '5th'
        ? 'graphData_5th.json'
        : 'graphData_firstfloor.json';

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

  const singleSelectedNodeId = selectedNodes.length === 1 ? selectedNodes[0] : null;
  const selectedNode = singleSelectedNodeId ? mapData.nodes[singleSelectedNodeId] : null;
  const selectedDestName = singleSelectedNodeId ? getDestinationName(singleSelectedNodeId) : null;
  const selectedDestPic = selectedDestName && mapData.destinations[selectedDestName] ? mapData.destinations[selectedDestName].pic : '';

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
            <option value="firstfloor">First Floor</option>
            <option value="5th">5th Floor</option>
          </select>

          <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid #e5e7eb', paddingLeft: '16px', marginRight: '8px' }}>
            <button 
              onClick={undo} 
              disabled={past.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: past.length === 0 ? '#f9fafb' : 'white', color: past.length === 0 ? '#d1d5db' : '#374151', cursor: past.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
              title="Undo"
            >
              ⟲ Undo <kbd style={{ fontSize: '10px', background: '#f3f4f6', padding: '2px 5px', borderRadius: '4px', color: past.length === 0 ? '#d1d5db' : '#6b7280', border: '1px solid #e5e7eb' }}>Ctrl+Z</kbd>
            </button>
            <button 
              onClick={redo} 
              disabled={future.length === 0}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: future.length === 0 ? '#d1d5db' : '#374151', cursor: future.length === 0 ? 'not-allowed' : 'pointer', fontSize: '12px', fontWeight: 600 }}
              title="Redo"
            >
              ⟳ Redo <kbd style={{ fontSize: '10px', background: '#f3f4f6', padding: '2px 5px', borderRadius: '4px', color: future.length === 0 ? '#d1d5db' : '#6b7280', border: '1px solid #e5e7eb' }}>Ctrl+Y</kbd>
            </button>
          </div>

          <button onClick={restoreOriginal} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}>Restore</button>
          <button onClick={saveOnly} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '8px', border: 'none', background: '#2563eb', color: 'white', cursor: 'pointer', fontWeight: 600, fontSize: '13px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}>
             Export JSON <kbd style={{ fontSize: '10px', background: 'rgba(255,255,255,0.25)', padding: '2px 5px', borderRadius: '4px', color: 'white' }}>S</kbd>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, gap: '16px', overflow: 'hidden' }}>
        
        {/* MAIN EDITOR AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
          
          {/* TOOLBAR */}
          <div style={{ display: 'flex', gap: 8, padding: '12px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', alignItems: 'center' }}>
            {[
              { id: 'view', label: 'View / Move', key: 'V' },
              { id: 'add_path', label: '+ Node', key: 'N' },
              { id: 'add_edge', label: '+ Edge', key: 'E' },
              { id: 'add_line', label: 'Draw Line', key: 'L' },
              { id: 'add_destination', label: '+ Dest', key: 'M' },
              { id: 'simulate', label: 'Test Path', key: 'T', color: '#f59e0b' },
              { id: 'delete', label: 'Delete', key: 'D', color: '#ef4444' }
            ].map(btn => {
              const isActive = mode === btn.id;
              const bgColor = btn.color || '#111827';
              return (
                <button key={btn.id} onClick={() => setMode(btn.id as any)} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '8px', border: isActive ? 'none' : '1px solid #e5e7eb', background: isActive ? bgColor : 'white', color: isActive ? 'white' : '#4b5563', cursor: 'pointer', fontWeight: 600, fontSize: '13px', boxShadow: isActive ? `0 2px 4px ${bgColor}40` : '0 1px 2px rgba(0,0,0,0.02)', transition: 'all 0.1s' }}>
                  {btn.label}
                  <kbd style={{ fontSize: '10px', fontFamily: 'monospace', padding: '2px 5px', background: isActive ? 'rgba(255,255,255,0.2)' : '#f3f4f6', borderRadius: '4px', color: isActive ? '#fff' : '#6b7280', border: isActive ? 'none' : '1px solid #d1d5db', marginLeft: '2px' }}>{btn.key}</kbd>
                </button>
              );
            })}

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280', fontSize: '12px' }}>
              <div style={{ display: 'flex', gap: '12px', borderRight: '1px solid #d1d5db', paddingRight: '12px' }}>
                <span title="Select multiple nodes" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ background: 'white', border: '1px solid #d1d5db', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Drag</kbd> Multi-Select</span>
                <span title="Pan the map view" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ background: 'white', border: '1px solid #d1d5db', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Space+Drag</kbd> Pan View</span>
                <span title="Split edge with node" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ background: 'white', border: '1px solid #d1d5db', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>Click Edge</kbd> Split Line</span>
                <span title="Reset Pan/Zoom" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><kbd style={{ background: 'white', border: '1px solid #d1d5db', padding: '2px 4px', borderRadius: '4px', fontSize: '10px', fontWeight: 600 }}>0</kbd> Reset</span>
              </div>
              
              <div style={{ minWidth: '150px', textAlign: 'right', fontWeight: 500 }}>
                {mode === 'add_edge' && selectedNodeForEdge && <span>Connecting <code>{selectedNodeForEdge}</code>...</span>}
                {mode === 'add_line' && <span>{lineStartPos ? `Click somewhere to draw line` : `Select start point`}</span>}
                {mode === 'simulate' && (
                  <span>{simNodes.start ? `From ${simNodes.start}` : 'Select start'} {simNodes.end ? `to ${simNodes.end}` : simNodes.start ? '• Select end' : ''}</span>
                )}
              </div>
            </div>
          </div>

          {/* MAP CANVAS */}
          <div 
            ref={containerRef}
            onMouseDown={handleMouseDown}
            style={{ position: 'relative', flex: 1, overflow: 'hidden', background: '#f3f4f6', cursor: isPanning ? 'grabbing' : (mode === 'view' && !draggedNode ? (isSpacePressed ? 'grab' : 'crosshair') : 'default'), touchAction: 'none' }}
          >
            <div style={{ 
              position: 'relative', 
              width: 'max-content', 
              margin: '20px',
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: '0 0',
              transition: isPanning ? 'none' : 'transform 0.1s ease-out'
            }}>
              <img src={maps[selectedMap].svg} alt="Map" style={{ display: 'block', width: `${dimensions.width}px`, height: `${dimensions.height}px`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <svg
                ref={svgRef}
                onClick={handleSvgClick}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                style={{ position: 'absolute', top: 0, left: 0, width: `${dimensions.width}px`, height: `${dimensions.height}px` }}
                viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
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

                {/* Ghost Line */ }
                {((mode === 'add_edge' && selectedNodeForEdge && mapData.nodes[selectedNodeForEdge]) || (mode === 'add_line' && lineStartPos)) && (
                  <line 
                    x1={mode === 'add_edge' ? mapData.nodes[selectedNodeForEdge!].x : lineStartPos!.x} 
                    y1={mode === 'add_edge' ? mapData.nodes[selectedNodeForEdge!].y : lineStartPos!.y} 
                    x2={mousePos.x} y2={mousePos.y} 
                    stroke="#2563eb" strokeWidth={2} strokeDasharray="5 3" opacity={0.5} 
                  />
                )}

                {/* Selection Box */}
                {selectionBox && (
                  <rect 
                    x={Math.min(selectionBox.startX, selectionBox.endX)} 
                    y={Math.min(selectionBox.startY, selectionBox.endY)} 
                    width={Math.abs(selectionBox.endX - selectionBox.startX)} 
                    height={Math.abs(selectionBox.endY - selectionBox.startY)} 
                    fill="rgba(59, 130, 246, 0.2)" stroke="#3b82f6" strokeWidth={1} 
                  />
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
                  const isSelected = selectedNodes.includes(nodeId);
                  const name = getDestinationName(nodeId);

                  return (
                    <g key={nodeId}>
                      <circle
                        cx={node.x} cy={node.y}
                        r={isSelected ? 8 : (hoveredNode === nodeId ? 6 : (isDest ? 5 : 3.5))}
                        fill={isDest ? '#a855f7' : '#10b981'}
                        stroke={isSelected ? '#111827' : 'white'}
                        strokeWidth={isSelected ? 3 : 1.5}
                        onMouseDown={(e) => { 
                          if (mode === 'view') { 
                            e.stopPropagation(); 
                            setDraggedNode(nodeId); 
                            dragStartStateRef.current = mapData;
                            wasDraggingRef.current = false;
                            setLastMousePos({ x: e.clientX, y: e.clientY });
                            dragStartMousePosRef.current = getSvgCoords(e);

                            if (!selectedNodes.includes(nodeId)) {
                              if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedNodes([nodeId]);
                              else setSelectedNodes(prev => [...prev, nodeId]);
                            } else if (e.shiftKey || e.ctrlKey || e.metaKey) {
                              setSelectedNodes(prev => prev.filter(id => id !== nodeId));
                            }
                          } 
                        }}
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
            {selectedNodes.length > 1 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', alignItems: 'center', textAlign: 'center', color: '#4b5563', marginTop: '40px' }}>
                <div style={{ fontSize: '48px' }}>📦</div>
                <div>
                  <h3 style={{ margin: 0 }}>{selectedNodes.length} Nodes Selected</h3>
                  <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px' }}>Drag to move them all together on the map, or delete them in bulk.</p>
                </div>
                <button onClick={() => deleteNodes(selectedNodes)} style={{ width: '100%', marginTop: '10px', padding: '10px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>Delete All ({selectedNodes.length})</button>
              </div>
            ) : singleSelectedNodeId && selectedNode ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px', textTransform: 'uppercase' }}>Node ID</label>
                  <code style={{ background: '#f3f4f6', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', display: 'block' }}>{singleSelectedNodeId}</code>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>X Coord</label>
                    <input type="number" value={selectedNode.x} onChange={(e) => handleUpdateNode(singleSelectedNodeId, { x: Number(e.target.value) })} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Y Coord</label>
                    <input type="number" value={selectedNode.y} onChange={(e) => handleUpdateNode(singleSelectedNodeId, { y: Number(e.target.value) })} 
                      style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '14px' }} />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#6b7280', marginBottom: '4px' }}>Type</label>
                  <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
                    <button onClick={() => handleUpdateNode(singleSelectedNodeId, { type: 'path' })} 
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: selectedNode.type === 'path' ? 'white' : 'transparent', color: selectedNode.type === 'path' ? '#111827' : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: selectedNode.type === 'path' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Path</button>
                    <button onClick={() => handleUpdateNode(singleSelectedNodeId, { type: 'destination' })} 
                      style={{ flex: 1, padding: '6px', borderRadius: '6px', border: 'none', background: selectedNode.type === 'destination' ? 'white' : 'transparent', color: selectedNode.type === 'destination' ? '#111827' : '#6b7280', fontSize: '13px', fontWeight: 600, cursor: 'pointer', boxShadow: selectedNode.type === 'destination' ? '0 1px 2px rgba(0,0,0,0.1)' : 'none' }}>Dest</button>
                  </div>
                </div>

                {selectedNode.type === 'destination' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '12px', background: '#faf5ff', borderRadius: '10px', border: '1px solid #f3e8ff' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7e22ce', marginBottom: '4px' }}>Display Name</label>
                      <input type="text" value={selectedDestName || ''} onChange={(e) => handleUpdateDestination(singleSelectedNodeId, e.target.value, selectedDestPic)} placeholder="e.g. B204"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '14px', outlineColor: '#a855f7' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#7e22ce', marginBottom: '4px' }}>Photo Filename</label>
                      <input type="text" value={selectedDestPic || ''} onChange={(e) => handleUpdateDestination(singleSelectedNodeId, selectedDestName || '', e.target.value)} placeholder="e.g. B204.jpeg"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e9d5ff', fontSize: '14px', outlineColor: '#a855f7' }} />
                    </div>
                  </div>
                )}

                <button onClick={() => deleteNodes([singleSelectedNodeId])} style={{ marginTop: '10px', padding: '10px', borderRadius: '8px', border: 'none', background: '#fee2e2', color: '#dc2626', fontWeight: 600, cursor: 'pointer', transition: 'background 0.2s' }}>Delete Node</button>

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

import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import TestMap from "../components/map/testMap"; 
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/usePDR";
import { applyCRFConstraints } from "../utils/mapMatching";

// Define types for the JSON data
interface DestinationData {
  node: string;
  pic: string;
}

interface TestData {
  meta: {
    building: string;
    floor: string;
    floorName: string;
    svg: string;
  };
  nodes: Record<string, { x: number; y: number; type: string }>;
  destinations: Record<string, DestinationData>;
  // Add other properties if needed
}

// Cast the imported JSON with proper typing
const typedTestData = testData as TestData;

const MAP_W = 4101;
const MAP_H = 3025;

// --- Styles Object (Inline CSS) ---
import MapHeader from "../components/map-view/MapHeader";
import MapControls from "../components/map-view/MapControls";
import NavigationMenu from "../components/map-view/NavigationMenu";
import LocationConfirmCard from "../components/map-view/LocationConfirmCard";
import TurnConfirmCard from "../components/map-view/TurnConfirmCard";
import { lightColors, darkColors } from "../components/map-view/theme";

type NodeType = { x: number; y: number; type: string };

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavActive, setIsNavActive] = useState(false);
  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  // Derived Colors & Styles
  const colors = isDarkMode ? darkColors : lightColors;

  const styles = useMemo(() => ({
    container: {
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      width: "100%",
      background: colors.background,
      color: colors.text,
      fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: "auto",
      position: "relative" as const,
      inset: "initial",
    } as CSSProperties,
    mapSection: {
      position: "absolute" as const,
      top: 0, left: 0, right: 0, bottom: 0,
      width: "100%", height: "100%",
      backgroundColor: isDarkMode ? "#020617" : "#F1F5F9", 
      overflow: "hidden",
      display: "flex", alignItems: "center", justifyContent: "center",
      zIndex: 0,
    },
    viewport: {
      width: "100%", height: "100%", position: "relative" as const, overflow: "hidden",
      background: isDarkMode ? "radial-gradient(circle at 50% 50%, #1e293b 0%, #0f172a 100%)" : "radial-gradient(circle at 50% 50%, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)",
      perspective: "1200px",
    },
    map3DWrapper: {
      width: "100%", height: "100%", transformStyle: "preserve-3d" as const, willChange: "transform",
    },
    camera: {
      position: "absolute" as const, inset: 0, transformOrigin: "0 0", willChange: "transform",
    },
  }), [colors, isDarkMode]);

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = useMemo(() => 
    Object.fromEntries(Object.entries(typedTestData.destinations).map(([key, val]) => [key, val.node])) as Record<string, string>,
    []
  );
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;

  const nodeMap = useMemo(() => typedTestData.nodes as Record<string, NodeType>, []);

  // Destination Markers
  const destinationMarkers = useMemo(() => {
    return Object.entries(destinations).map(([name, id]) => {
      const node = nodeMap[id];
      if (!node) return null;
      return { name, x: node.x, y: node.y, id, pic: typedTestData.destinations[name]?.pic };
    }).filter((item): item is {name: string, x: number, y: number, id: string, pic: string} => item !== null);
  }, [destinations, nodeMap]);

  // Starting Coordinates
  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  // Dijkstra Route calculation
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

  // Reset path when route changes
  useEffect(() => {
    setActualPath([]);
    setIsDeviated(false);
  }, [routePath]);

  // Route points for deviation check
  const routePoints = useMemo(() => {
    return routePath.map(id => nodeMap[id]).filter(n => n);
  }, [routePath, nodeMap]);

  // States for actual path and deviation
  const [actualPath, setActualPath] = useState<{x: number, y: number}[]>([]);
  const [isDeviated, setIsDeviated] = useState(false);
  
  // --- MANUAL STEP NAVIGATION ---
  const [stepIndex, setStepIndex] = useState(0);
  
  // Reset step index when route changes
  useEffect(() => {
    setStepIndex(0);
  }, [routePath]);

  // 1. PDR HOOK
  const [isPaused, setIsPaused] = useState(false);
  const { rawPos, heading, forceSetPos, currentSpeed } = usePDR(startNode.x, startNode.y, isNavActive, 0, routePath, isPaused);

  const handleNextStep = () => {
    if (routePath.length === 0) return;
    const nextIndex = Math.min(stepIndex + 1, routePath.length - 1);
    setStepIndex(nextIndex);
    const nodeId = routePath[nextIndex];
    if (nodeId && nodeMap[nodeId]) {
        forceSetPos(nodeMap[nodeId].x, nodeMap[nodeId].y);
    }
  };

  const handlePrevStep = () => {
    if (routePath.length === 0) return;
    const prevIndex = Math.max(stepIndex - 1, 0);
    setStepIndex(prevIndex);
    const nodeId = routePath[prevIndex];
    if (nodeId && nodeMap[nodeId]) {
        forceSetPos(nodeMap[nodeId].x, nodeMap[nodeId].y);
    }
  };


  // Turn Detection Logic
  const [showTurnPopup, setShowTurnPopup] = useState(false);
  const [pendingTurnNode, setPendingTurnNode] = useState<{id: string, x: number, y: number} | null>(null);
  const checkedTurns = useRef<Set<string>>(new Set());

  // Location Confirmation
  const [locationToConfirm, setLocationToConfirm] = useState<{name: string, pic: string} | null>(null);
  const shownDestinations = useRef<Set<string>>(new Set());

  // Destination Image Modal
  const [selectedDestination, setSelectedDestination] = useState<{name: string, pic: string} | null>(null);

  const turnNodes = useMemo(() => {
    const turns: string[] = [];
    if (routePath.length < 3) return turns;
    for (let i = 1; i < routePath.length - 1; i++) {
        const prev = nodeMap[routePath[i - 1]];
        const curr = nodeMap[routePath[i]];
        const next = nodeMap[routePath[i + 1]];
        if (!prev || !curr || !next) continue;

        const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
        const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
        let diff = Math.abs(angle1 - angle2);
        if (diff > Math.PI) diff = 2 * Math.PI - diff;
        if (diff > 0.6) turns.push(routePath[i]);
    }
    return turns;
  }, [routePath, nodeMap]);

  // 2. GLOBAL TUNNEL CONSTRAINTS
  const snapResult = useMemo(() => {
    return applyCRFConstraints(rawPos.x, rawPos.y, routePath);
  }, [rawPos, routePath]);
  
  const snappedPos = { x: snapResult.x, y: snapResult.y };

  // --- NAVIGATION STATE CALCULATION ---
  const navState = useMemo(() => {
    if (!routePath.length) return { turnType: 'straight', distToTurn: 0, totalRem: 0 };
    let turnType = 'straight';
    let distToTurn = 0;
    let currentIdx = 0;
    let minD = Infinity;
    routePath.forEach((id, idx) => {
       const n = nodeMap[id];
       const d = Math.hypot(snappedPos.x - n.x, snappedPos.y - n.y);
       if (d < minD) { minD = d; currentIdx = idx; }
    });
    for (let i = currentIdx; i < routePath.length - 1; i++) {
       const curr = nodeMap[routePath[i]];
       const next = nodeMap[routePath[i+1]];
       const after = routePath[i+2] ? nodeMap[routePath[i+2]] : null;
       distToTurn += Math.hypot(curr.x - next.x, curr.y - next.y);
       if (after) {
          const angle1 = Math.atan2(next.y - curr.y, next.x - curr.x);
          const angle2 = Math.atan2(after.y - next.y, after.x - next.x);
          let diff = angle2 - angle1;
          while (diff <= -Math.PI) diff += 2*Math.PI;
          while (diff > Math.PI) diff -= 2*Math.PI;
          if (Math.abs(diff) > 0.5) { turnType = diff > 0 ? 'right' : 'left'; break; }
       }
    }
    if (currentIdx >= routePath.length - 1) turnType = 'finish';
    let totalRem = 0;
    for(let i=currentIdx; i<routePath.length-1; i++){
        const n1 = nodeMap[routePath[i]];
        const n2 = nodeMap[routePath[i+1]];
        totalRem += Math.hypot(n1.x - n2.x, n1.y - n2.y);
    }
    const PIXELS_PER_METER = 50; 
    return {
       turnType,
       distToTurn: Math.max(0, distToTurn / PIXELS_PER_METER),
       totalRem: Math.max(0, totalRem / PIXELS_PER_METER)
    };
  }, [snappedPos, routePath, nodeMap]);

  // --- TTS INSTRUCTION ---
  const [isMuted, setIsMuted] = useState(false);
  const lastSpokenInstruction = useRef<string | null>(null);

  useEffect(() => {
    const synth = window.speechSynthesis;
    if (isMuted) {
        if (synth) synth.cancel();
        return;
    }

    if (!isNavActive) return;

    const { turnType, distToTurn } = navState;
    
    // Reset memory when far from next action to allow repeating for next similar turn
    if (distToTurn > 30) {
        lastSpokenInstruction.current = null;
        return;
    }

    if (!synth) return;

    const speak = (text: string) => {
        if (lastSpokenInstruction.current === text) return;
        
        synth.cancel(); 
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.0; 
        synth.speak(utterance);
        lastSpokenInstruction.current = text;
    };

    // 1. Arrival Logic
    if (turnType === 'finish') {
        if (distToTurn < 8) speak("You have arrived");
        else if (distToTurn < 20 && distToTurn > 10) speak("Destination is ahead in 15 meters");
        return;
    }

    // 2. Turn Logic - Dynamic Updates
    // We quantize the distance to avoid "Turn left in 18.23 meters" 
    // but give updates every ~5 meters when close, and ~10 meters when further away.
    
    // Only announce turns when within 40 meters
    if (distToTurn <= 40) {
        let quantizedDist = 0;
        
        if (distToTurn > 20) {
            // Above 20m, round to nearest 10m (e.g., 30m, 40m)
            quantizedDist = Math.round(distToTurn / 10) * 10;
        } else {
            // Below 20m, round to nearest 5m (e.g., 20m, 15m, 10m, 5m)
            quantizedDist = Math.round(distToTurn / 5) * 5;
        }

        // Avoid announcing "0 meters" if we are practically there (handled by <6m logic previously, but let's be safe)
        if (quantizedDist === 0) quantizedDist = 5; 

        const instructions = [
            `In ${quantizedDist} meters, turn ${turnType}`,
            `Turn ${turnType} in ${quantizedDist} meters`,
            `Upcoming ${turnType} turn in ${quantizedDist} meters`
        ];
        
        // Simple rotation or random selection for "dynamic" feel
        // We use the quantizedDist as a seed to pick a consistent phrase for that specific distance
        // so it doesn't flip-flop randomly between recalcs.
        const phraseIndex = quantizedDist % instructions.length;
        speak(instructions[phraseIndex]);
    }

  }, [navState, isNavActive, isMuted]);

  useEffect(() => { if (isNavActive) setIsDeviated(!snapResult.isOnRoute); }, [snapResult, isNavActive]);

  useEffect(() => {
    if (!isNavActive || isPaused) return;
    for (const nodeId of turnNodes) {
        if (checkedTurns.current.has(nodeId)) continue;
        const node = nodeMap[nodeId];
        const dist = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        if (dist < 80 && isDeviated) {
            setIsPaused(true);
            setPendingTurnNode({ id: nodeId, ...node });
            setShowTurnPopup(true);
            checkedTurns.current.add(nodeId);
            break; 
        }
    }
  }, [snappedPos, isNavActive, isPaused, turnNodes, nodeMap, isDeviated]);

  const handleConfirmTurn = () => {
    if (pendingTurnNode) forceSetPos(pendingTurnNode.x, pendingTurnNode.y);
    setShowTurnPopup(false);
    setIsPaused(false);
    setPendingTurnNode(null);
  };

  const handleSkipTurn = () => { setShowTurnPopup(false); setIsPaused(false); setPendingTurnNode(null); };

  useEffect(() => {
    if (!isNavActive || routePoints.length < 2) return;
    setActualPath(prev => {
      const last = prev[prev.length - 1];
      if (!last || Math.hypot(snappedPos.x - last.x, snappedPos.y - last.y) > 10) return [...prev, snappedPos];
      return prev;
    });
  }, [snappedPos, isNavActive, routePoints]);

  // Reset shown destinations when navigation starts
  useEffect(() => {
    if (isNavActive) {
      shownDestinations.current.clear();
    }
  }, [isNavActive]);

  // Location Confirmation Logic
  useEffect(() => {
    if (!isNavActive || locationToConfirm) return; // Don't show if already showing or not navigating

    const nearbyDestinations = destinationMarkers.filter(dest => {
      const dist = Math.hypot(snappedPos.x - dest.x, snappedPos.y - dest.y);
      return dist < 150 && dest.pic && !shownDestinations.current.has(dest.name); // Within 150 units, has image, and not shown before
    });

    if (nearbyDestinations.length > 0) {
      // Show the closest one
      const closest = nearbyDestinations.reduce((prev, curr) => {
        const prevDist = Math.hypot(snappedPos.x - prev.x, snappedPos.y - prev.y);
        const currDist = Math.hypot(snappedPos.x - curr.x, snappedPos.y - curr.y);
        return currDist < prevDist ? curr : prev;
      });

      setLocationToConfirm({ name: closest.name, pic: closest.pic });
      shownDestinations.current.add(closest.name); // Mark as shown
    }
  }, [snappedPos, isNavActive, destinationMarkers, locationToConfirm]);



  const handleConfirmLocation = () => {
    if (locationToConfirm) {
      // Find the destination node and reposition
      const destNode = destinationMarkers.find(d => d.name === locationToConfirm.name);
      if (destNode) {
        forceSetPos(destNode.x, destNode.y);
      }
    }
    setLocationToConfirm(null);
  };

  const handleRejectLocation = () => {
    setLocationToConfirm(null);
  };

  const handleReroute = () => {
    let minD = Infinity; let closestId = "";
    Object.entries(nodeMap).forEach(([id, node]) => {
        const d = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        if (d < minD) { minD = d; closestId = id; }
    });
    if (closestId) navigate(`/map?origin=${closestId}&dest=${destId}`);
  };
  
  const startNavigation = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res === 'granted') setIsNavActive(true);
      } catch (e) { console.error("Sensor permission denied", e); }
    } else { setIsNavActive(true); }
    setActualPath([]); setIsDeviated(false);
  };

  // ============================================
  //   GSAP OPTIMIZED INTERACTIVE MAP LOGIC
  // ============================================

  // Refs for State (Mutable, No Re-renders)
  const camState = useRef({ x: 0, y: 0, zoom: 0.8, bearing: 0, pitch: 45 });

  // DOM Refs
  const viewportRef = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const compassRef = useRef<HTMLDivElement>(null);

  // Logic Refs
  const [autoFollow, setAutoFollow] = useState(true);
  
  // Gesture Refs
  const lastPointer = useRef<{x: number, y: number} | null>(null);
  const pointers = useRef<Map<number, {x: number, y: number}>>(new Map());
  const initialGestureState = useRef<{dist: number, angle: number, bearing: number} | null>(null);

  // Initialize GSAP Setters for performance
  useEffect(() => {
      if(map3DRef.current) gsap.set(map3DRef.current, { rotateX: 45, rotateZ: 0 });
      if(cameraLayerRef.current) gsap.set(cameraLayerRef.current, { x: 0, y: 0, scale: 0.8 });
  }, []);

  // Sync AutoFollow with GSAP
  useEffect(() => {
    if (!autoFollow || !viewportRef.current) return;
    
    const vp = viewportRef.current;
    const cx = vp.clientWidth / 2;
    const cy = vp.clientHeight / 2;
    const { zoom } = camState.current;

    const targetX = cx - snappedPos.x * zoom;
    const targetY = cy - snappedPos.y * zoom;

    const clamped = clampCamera(targetX, targetY, zoom);

    gsap.to(cameraLayerRef.current, {
        x: clamped.x,
        y: clamped.y,
        duration: 0.5,
        ease: "power2.out",
        onUpdate: () => {
             // Keep internal ref sync if needed, but for auto-follow we trust the tween target
        },
        onComplete: () => {
            camState.current.x = clamped.x;
            camState.current.y = clamped.y;
        }
    });

  }, [snappedPos, autoFollow]);


  // Clamp Helper
  const clampCamera = (nextX: number, nextY: number, nextZoom: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: nextX, y: nextY, z: nextZoom };
    
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    
    const minZoomW = vpW / MAP_W;
    const minZoomH = vpH / MAP_H;
    const minZoom = Math.max(minZoomW, minZoomH); // Ensure longest side covers
    const safeZoom = Math.max(nextZoom, minZoom);
    
    const minX = vpW - (MAP_W * safeZoom);
    const maxX = 0;
    const minY = vpH - (MAP_H * safeZoom);
    const maxY = 0;
    
    let resultX = nextX;
    if (minX > maxX) resultX = (vpW - MAP_W * safeZoom) / 2;
    else resultX = Math.min(maxX, Math.max(minX, nextX));
    
    let resultY = nextY;
    if (minY > maxY) resultY = (vpH - MAP_H * safeZoom) / 2;
    else resultY = Math.min(maxY, Math.max(minY, nextY));
    
    return { x: resultX, y: resultY, z: safeZoom };
  };

  // --- INTERACTION HANDLERS ---

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    
    setAutoFollow(false);
    gsap.killTweensOf(cameraLayerRef.current); // Stop auto-follow animation
    
    camState.current.x = gsap.getProperty(cameraLayerRef.current, "x") as number;
    camState.current.y = gsap.getProperty(cameraLayerRef.current, "y") as number;

    if (pointers.current.size === 1) {
        lastPointer.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
        const pts = Array.from(pointers.current.values());
        const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        initialGestureState.current = { dist, angle, bearing: camState.current.bearing };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    const pts = Array.from(pointers.current.values());

    // 1. PAN (1 Finger)
    if (pointers.current.size === 1 && lastPointer.current) {
        const dx = e.clientX - lastPointer.current.x;
        const dy = e.clientY - lastPointer.current.y;
        
        const rad = (camState.current.bearing * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const rDx = dx * cos + dy * sin;
        const rDy = dy * cos - dx * sin;

        const nextX = camState.current.x + rDx;
        const nextY = camState.current.y + rDy;
        const clamped = clampCamera(nextX, nextY, camState.current.zoom);
        
        gsap.set(cameraLayerRef.current, { x: clamped.x, y: clamped.y });
        
        camState.current.x = clamped.x;
        camState.current.y = clamped.y;
        
        lastPointer.current = { x: e.clientX, y: e.clientY };
    }
    // 2. ROTATE (2 Fingers)
    else if (pointers.current.size === 2 && initialGestureState.current) {
        const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
        const rotationDelta = (angle - initialGestureState.current.angle) * (180 / Math.PI);
        const newBearing = initialGestureState.current.bearing + rotationDelta;

        gsap.set(map3DRef.current, { rotateZ: newBearing });
        gsap.set(compassRef.current, { rotation: newBearing });
        camState.current.bearing = newBearing;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) initialGestureState.current = null;
    if (pointers.current.size === 1) {
        const p = Array.from(pointers.current.values())[0];
        lastPointer.current = { x: p.x, y: p.y };
    }
  };

  // --- BUTTON ACTIONS ---

  const handleRecenter = () => {
    const vp = viewportRef.current;
    if (!vp) return;
    setAutoFollow(true); 
    camState.current.bearing = 0;
    camState.current.pitch = 45;
    gsap.to(map3DRef.current, { rotateZ: 0, rotateX: 45, duration: 0.8, ease: "power2.inOut" });
    gsap.to(compassRef.current, { rotation: 0, duration: 0.8 });
  };
  
  const handleZoom = (direction: 'in' | 'out') => {
    setAutoFollow(false);
    const { zoom, x, y } = camState.current;
    let newZoom = direction === 'in' ? zoom * 1.35 : zoom / 1.35;
    const clamped = clampCamera(x, y, newZoom);
    
    gsap.to(cameraLayerRef.current, {
        scale: clamped.z,
        x: clamped.x,
        y: clamped.y,
        duration: 0.4,
        ease: "power2.out"
    });
    
    camState.current.zoom = clamped.z;
    camState.current.x = clamped.x;
    camState.current.y = clamped.y;
  };

  if (!originId || !destId) return <div style={{color: 'white', padding: '20px'}}>Invalid Route</div>;

  return (
    <div style={styles.container}>
      <MapHeader 
        buildingName={typedTestData.meta.building} 
        floorName={typedTestData.meta.floorName} 
        onBack={() => navigate('/')} 
      />

      <div style={styles.mapSection}>
        {isNavActive && (
          <>
          </>
        )}
        <div 
            ref={viewportRef} 
            style={styles.viewport}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onPointerCancel={handlePointerUp}
        >
          <div ref={map3DRef} style={styles.map3DWrapper}>
            <div ref={cameraLayerRef} style={styles.camera}>
                <TestMap routePath={routePath} actualPath={actualPath} isDeviated={isDeviated} />
                <div style={{
                  position: "absolute",
                  left: snappedPos.x,
                  top: snappedPos.y,
                  transform: `translate(-50%, -50%) rotate(${heading}deg)`,
                  transition: 'transform 0.2s linear', 
                  zIndex: 30,
                  pointerEvents: "none",
                  filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.2))",
                }}>
                    <svg width="120" height="120" viewBox="0 0 120 120" fill="none">
                       <defs>
                         <radialGradient id="vision" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 60) rotate(-90) scale(60 60)">
                            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4"/>
                            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0"/>
                         </radialGradient>
                         <linearGradient id="arrowGrad" x1="60" y1="20" x2="60" y2="100" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#F59E0B" />
                            <stop offset="1" stopColor="#D97706" /> 
                         </linearGradient>
                       </defs>
                       <path d="M60 60 L20 10 Q 60 -10 100 10 Z" fill="url(#vision)"/>
                       <path d="M60 20 L85 90 L60 75 L35 90 L60 20 Z" fill="url(#arrowGrad)" stroke="white" strokeWidth="3" strokeLinejoin="round" />
                       <circle cx="60" cy="70" r="6" fill="white" />
                    </svg>
                </div>
                
                {/* Floating Destination Labels */}
                {destinationMarkers.map((dest) => {
                    const dist = Math.hypot(snappedPos.x - dest.x, snappedPos.y - dest.y);
                    const isNear = dist < 250; 
                    
                    return (
                        <div key={dest.name} 
                             onClick={() => dest.pic && setSelectedDestination({name: dest.name, pic: dest.pic})}
                             style={{
                            position: "absolute",
                            left: dest.x,
                            top: dest.y,
                            transform: `translate(-50%, -100%) scale(${isNear ? 1.2 : 1})`,
                            marginTop: "-25px",
                            background: isNear ? colors.accent : "rgba(255, 255, 255, 0.9)",
                            color: isNear ? "white" : colors.primary,
                            padding: "6px 12px",
                            borderRadius: "12px",
                            boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                            fontSize: isNear ? "14px" : "12px",
                            fontWeight: 700,
                            pointerEvents: "auto",
                            cursor: dest.pic ? "pointer" : "default",
                            zIndex: isNear ? 45 : 40,
                            whiteSpace: "nowrap",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            opacity: 0.9,
                            border: `2px solid ${isNear ? "white" : colors.secondary}`,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            // Ensure it's readable by rotating counter to map rotation if needed, 
                            // but currently map rotates the layer, so labels rotate with it.
                            // To keep text upright, we would need to rotate it back:
                            // transform: `translate(-50%, -100%) rotate(${-heading}deg) ...`
                            // But here 'heading' is user heading. 
                            // The map rotation is controlled by map3DRef / camState.current.bearing.
                            // If user wants labels to always be upright, we'd need access to the current map rotation state.
                            // However, simplified approach is fine for now.
                        }}>
                           <span>📍</span> {dest.name}
                        </div>
                    );
                })}
            </div>
          </div>
          
          <MapControls 
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            isNavActive={isNavActive}
            currentSpeed={currentSpeed}
            navState={navState}
            onRecenter={handleRecenter}
            onZoomIn={() => handleZoom('in')}
            onZoomOut={() => handleZoom('out')}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            autoFollow={autoFollow}
          />
        </div>


        {/* Floating Destination Image Modal */}
        {selectedDestination && (
          <div 
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0,0,0,0.7)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 2000,
            }}
            onClick={() => setSelectedDestination(null)}
          >
            <div 
              style={{
                backgroundColor: "white",
                padding: "20px",
                borderRadius: "12px",
                maxWidth: "90vw",
                maxHeight: "90vh",
                position: "relative",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedDestination(null)}
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  background: "none",
                  border: "none",
                  fontSize: "24px",
                  cursor: "pointer",
                }}
              >
                ×
              </button>
              <h3 style={{ marginTop: 0, marginBottom: "10px" }}>{selectedDestination.name}</h3>
              <img 
                src={`/${selectedDestination.pic}`} 
                alt={selectedDestination.name} 
                style={{ 
                  maxWidth: "100%", 
                  maxHeight: "70vh", 
                  borderRadius: "8px" 
                }} 
              />
            </div>
          </div>
        )}
      </div>

      {/* POPUP OVERLAYS - Moved outside mapSection to sit above everything */}
      
      {locationToConfirm && (
        <LocationConfirmCard
            room={locationToConfirm.name}
            image={`/${locationToConfirm.pic}`}
            onConfirm={handleConfirmLocation}
            onReject={handleRejectLocation}
        />
      )}

      {showTurnPopup && isPaused && (
        <TurnConfirmCard
            onConfirm={handleConfirmTurn}
            onReject={handleSkipTurn}
        />
      )}

      {isDeviated && (
        <div style={{
            position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", 
            background: "#EF4444", color: "white", padding: "12px 24px", 
            borderRadius: "30px", fontWeight: "bold", zIndex: 2000,
            boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
            display: "flex", alignItems: "center", gap: "10px"
        }}>
            <span>⚠️ Off Route!</span>
            <button 
              onClick={handleReroute}
              style={{ background: "white", color: "#EF4444", border: "none", padding: "6px 14px", borderRadius: "16px", fontWeight: "bold" }}
            >
              Reroute ⟳
            </button>
        </div>
      )}
      
      <NavigationMenu 
        isNavActive={isNavActive}
        onStartNavigation={startNavigation}
        onStopNavigation={() => setIsNavActive(false)}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default MapView;
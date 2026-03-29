import {
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { useSearchParams } from "react-router-dom";
import gsap from "gsap";
import TestMap from "../components/map/testMap";
import { applyCRFConstraints } from "../utils/mapMatching";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/usePDR";

import MapControls from "../components/map-view/MapControls";
import NavigationMenu from "../components/map-view/NavigationMenu";
import LocationConfirmCard from "../components/map-view/LocationConfirmCard";
import TurnConfirmCard from "../components/map-view/TurnConfirmCard";
import QRScanner from "../components/QRScanner";

// Types
interface DestinationData { node: string; pic: string }
interface TestData {
  meta: { building: string; floor: string; floorName: string; svg: string };
  nodes: Record<string, { x: number; y: number; type: string }>;
  destinations: Record<string, DestinationData>;
  edges: any;
}
type NodeType = { x: number; y: number; type: string };

const dataModules = import.meta.glob('../data/*.json', { eager: true });

const floors: Record<string, TestData> = {};
Object.entries(dataModules).forEach(([path, mod]) => {
  const filename = path.split('/').pop()?.replace('.json', '');
  let id = filename || 'unknown';
  
  // Backward compatibility with legacy IDs
  if (id === 'test_1') id = 'test';
  else if (id === 'graphData_firstfloor') id = 'firstfloor';
  else if (id === 'graphData4th') id = 'fourthfloor';
  
  floors[id] = ((mod as any).default || mod) as TestData;
});

const MAP_W = 4101;
const MAP_H = 3025;
const FIXED_PITCH = 0; 
const ZOOM_MULT = 4.3;

const MapView = () => {
  const [searchParams] = useSearchParams();
  const [isNavActive, setIsNavActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const floorParam = searchParams.get("floor") || "test";
  const typedTestData = floors[floorParam] || floors["test"];

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = useMemo(
    () => Object.fromEntries(
      Object.entries(typedTestData.destinations).map(([k, v]) => [k, v.node]),
    ) as Record<string, string>,
    [typedTestData],
  );
  
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;
  
  const nodeMap = useMemo(() => typedTestData.nodes as Record<string, NodeType>, [typedTestData]);

  const destinationMarkers = useMemo(() => {
    return Object.entries(destinations)
      .map(([name, id]) => {
        const node = nodeMap[id];
        if (!node) return null;
        return { name, x: node.x, y: node.y, id, pic: typedTestData.destinations[name]?.pic };
      })
      .filter((i): i is { name: string; x: number; y: number; id: string; pic: string } => i !== null);
  }, [destinations, nodeMap, typedTestData]);

  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap, typedTestData.edges);
  }, [originId, destId, nodeMap, typedTestData.edges]);

  const routePoints = useMemo(() => routePath.map((id) => nodeMap[id]).filter(Boolean), [routePath, nodeMap]);

  const [actualPath, setActualPath] = useState<{ x: number; y: number }[]>([]);
  const [isDeviated, setIsDeviated] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showTurnPopup, setShowTurnPopup] = useState(false);
  const [pendingTurnNode, setPendingTurnNode] = useState<{ id: string; x: number; y: number } | null>(null);
  const checkedTurns = useRef<Set<string>>(new Set());
  const [locationToConfirm, setLocationToConfirm] = useState<{ name: string; pic: string } | null>(null);
  const shownDestinations = useRef<Set<string>>(new Set());
  const [selectedDestination, setSelectedDestination] = useState<{ name: string; pic: string } | null>(null);
  const [isRecalibrating, setIsRecalibrating] = useState(false);

  useEffect(() => { setActualPath([]); setIsDeviated(false); }, [routePath]);
  useEffect(() => { setStepIndex(0); }, [routePath]);

  const { rawPos, heading, forceSetPos, currentSpeed: _currentSpeed } = usePDR(startNode.x, startNode.y, isNavActive, 0, routePath, isPaused);

  const snapResult = useMemo(() => applyCRFConstraints(rawPos.x, rawPos.y, nodeMap, typedTestData.edges, routePath), [rawPos, nodeMap, typedTestData.edges, routePath]);
  const snappedPos = { x: snapResult.x, y: snapResult.y };

  const navState = useMemo(() => {
    if (!routePath.length) return { turnType: "straight", distToTurn: 0, totalRem: 0 };
    let turnType = "straight";
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
      const next = nodeMap[routePath[i + 1]];
      const after = routePath[i + 2] ? nodeMap[routePath[i + 2]] : null;
      if (!curr || !next) continue;
      distToTurn += Math.hypot(curr.x - next.x, curr.y - next.y);
      if (after) {
        const a1 = Math.atan2(next.y - curr.y, next.x - curr.x);
        const a2 = Math.atan2(after.y - next.y, after.x - next.x);
        let diff = a2 - a1;
        while (diff <= -Math.PI) diff += 2 * Math.PI;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        if (Math.abs(diff) > 0.5) { turnType = diff > 0 ? "right" : "left"; break; }
      }
    }
    if (currentIdx >= routePath.length - 1) turnType = "finish";
    let totalRem = 0;
    for (let i = currentIdx; i < routePath.length - 1; i++) {
      const n1 = nodeMap[routePath[i]];
      const n2 = nodeMap[routePath[i + 1]];
      if (n1 && n2) totalRem += Math.hypot(n1.x - n2.x, n1.y - n2.y);
    }
    const PX_PER_M = 12.2;
    return { turnType, distToTurn: Math.max(0, distToTurn / PX_PER_M), totalRem: Math.max(0, totalRem / PX_PER_M) };
  }, [snappedPos, routePath, nodeMap]);

  const progress = useMemo(() => {
    if (!routePath.length || !snappedPos) return 0;
    const PX_PER_M = 12.2;
    const totalDist = routePoints.reduce((acc, p, i) => {
      if (i === 0) return 0;
      const prev = routePoints[i - 1];
      return acc + Math.hypot(p.x - prev.x, p.y - prev.y);
    }, 0);
    const remDist = navState.totalRem * PX_PER_M;
    return Math.min(100, Math.max(0, 100 - (remDist / totalDist) * 100));
  }, [navState.totalRem, routePath, snappedPos, routePoints]);

  const handleQrRecalibrate = (result: string) => {
    const targetNodeId = destinations[result] || result;
    const targetNode = nodeMap[targetNodeId];
    if (targetNode) {
      forceSetPos(targetNode.x, targetNode.y);
      setIsRecalibrating(false);
    }
  };

  const handleNextStep = () => {
    if (!routePath.length) return;
    const next = Math.min(stepIndex + 1, routePath.length - 1);
    setStepIndex(next);
    const n = nodeMap[routePath[next]];
    if (n) forceSetPos(n.x, n.y);
  };
  const handlePrevStep = () => {
    if (!routePath.length) return;
    const prev = Math.max(stepIndex - 1, 0);
    setStepIndex(prev);
    const n = nodeMap[routePath[prev]];
    if (n) forceSetPos(n.x, n.y);
  };

  const turnNodes = useMemo(() => {
    const turns: string[] = [];
    if (routePath.length < 3) return turns;
    for (let i = 1; i < routePath.length - 1; i++) {
      const prev = nodeMap[routePath[i - 1]];
      const curr = nodeMap[routePath[i]];
      const next = nodeMap[routePath[i + 1]];
      if (!prev || !curr || !next) continue;
      const a1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
      const a2 = Math.atan2(next.y - curr.y, next.x - curr.x);
      let diff = Math.abs(a1 - a2);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff > 0.6) turns.push(routePath[i]);
    }
    return turns;
  }, [routePath, nodeMap]);

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

  const handleConfirmTurn = () => { if (pendingTurnNode) forceSetPos(pendingTurnNode.x, pendingTurnNode.y); setShowTurnPopup(false); setIsPaused(false); setPendingTurnNode(null); };
  const handleSkipTurn = () => { setShowTurnPopup(false); setIsPaused(false); setPendingTurnNode(null); };

  useEffect(() => {
    if (!isNavActive || routePoints.length < 2) return;
    setActualPath((prev) => {
      const last = prev[prev.length - 1];
      if (!last || Math.hypot(snappedPos.x - last.x, snappedPos.y - last.y) > 10) return [...prev, snappedPos];
      return prev;
    });
  }, [snappedPos, isNavActive, routePoints]);

  useEffect(() => {
    if (!isNavActive || locationToConfirm) return;
    const nearby = destinationMarkers.filter((d) => {
      const dist = Math.hypot(snappedPos.x - d.x, snappedPos.y - d.y);
      return dist < 150 && d.pic && !shownDestinations.current.has(d.name);
    });
    if (nearby.length > 0) {
      const closest = nearby.reduce((a, b) =>
        Math.hypot(snappedPos.x - b.x, snappedPos.y - b.y) < Math.hypot(snappedPos.x - a.x, snappedPos.y - a.y) ? b : a,
      );
      setLocationToConfirm({ name: closest.name, pic: closest.pic });
      shownDestinations.current.add(closest.name);
    }
  }, [snappedPos, isNavActive, destinationMarkers, locationToConfirm]);

  const handleConfirmLocation = () => {
    if (locationToConfirm) {
      const d = destinationMarkers.find((m) => m.name === locationToConfirm.name);
      if (d) forceSetPos(d.x, d.y);
    }
    setLocationToConfirm(null);
  };
  const handleRejectLocation = () => setLocationToConfirm(null);



  const startNavigation = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
      try {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res === "granted") setIsNavActive(true);
      } catch (e) { console.error("Sensor permission denied", e); }
    } else { setIsNavActive(true); }
    setActualPath([]);
    setIsDeviated(false);
  };

  const camState = useRef({ x: 0, y: 0, zoom: 1, bearing: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const [autoFollow, setAutoFollow] = useState(true);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPointer = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!viewportRef.current || !cameraLayerRef.current || !map3DRef.current) return;
    gsap.to(map3DRef.current, { rotateX: FIXED_PITCH, rotateZ: 0, rotateY: 0, duration: 1.2, ease: "power2.out" });

    if (routePoints.length > 0) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      routePoints.forEach((p) => {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.y > maxY) maxY = p.y;
      });
      const padding = 120;
      minX -= padding; maxX += padding;
      minY -= padding; maxY += padding;
      const routeW = maxX - minX;
      const routeH = maxY - minY;
      const vp = viewportRef.current;
      const vpW = vp.clientWidth;
      const vpH = vp.clientHeight;
      const zoomX = vpW / Math.max(routeW, 1);
      const zoomY = vpH / Math.max(routeH, 1);
      const zoom = Math.min(zoomX, zoomY) * ZOOM_MULT;
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const camX = vpW / 2 - centerX * zoom;
      const camY = vpH / 2 - centerY * zoom;
      camState.current = { x: camX, y: camY, zoom, bearing: 0 };
      gsap.to(cameraLayerRef.current, { x: camX, y: camY, scale: zoom, duration: 0.8, ease: "power2.out" });
    } else {
      const vp = viewportRef.current;
      const z = Math.max(vp.clientWidth / MAP_W, vp.clientHeight / MAP_H) * ZOOM_MULT;
      camState.current = { x: 0, y: 0, zoom: z, bearing: 0 };
      gsap.set(cameraLayerRef.current, { x: 0, y: 0, scale: z });
    }
  }, [routePoints]);

  useEffect(() => {
    if (!autoFollow || !viewportRef.current) return;
    const vp = viewportRef.current;
    const { zoom } = camState.current;
    const tx = vp.clientWidth / 2 - snappedPos.x * zoom;
    const ty = vp.clientHeight / 2 - snappedPos.y * zoom;
    gsap.to(cameraLayerRef.current, {
      x: tx, y: ty, duration: 0.5, ease: "power3.out",
      onComplete: () => { camState.current.x = tx; camState.current.y = ty; },
    });
  }, [snappedPos, autoFollow]);

  const clampCamera = (nx: number, ny: number, nz: number, focus?: { x: number; y: number }, marginPercent = 0.05) => {
    const vp = viewportRef.current;
    if (!vp) return { x: nx, y: ny, z: nz };
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const minZoom = Math.max(vpW / MAP_W, vpH / MAP_H);
    let z = Math.max(nz, minZoom);
    const maxZoom = 8;
    while ((MAP_W * z < vpW || MAP_H * z < vpH) && z < maxZoom) z = Math.min(maxZoom, z * 1.1);
    const minX = vpW - MAP_W * z;
    const maxX = 0;
    const minY = vpH - MAP_H * z;
    const maxY = 0;
    let rx = nx;
    if (minX > maxX) rx = (vpW - MAP_W * z) / 2;
    else rx = Math.min(maxX, Math.max(minX, nx));
    let ry = ny;
    if (minY > maxY) ry = (vpH - MAP_H * z) / 2;
    else ry = Math.min(maxY, Math.max(minY, ny));

    if (focus) {
      const marginX = vpW * marginPercent;
      const marginY = vpH * marginPercent;
      const screenX = focus.x * z + rx;
      const screenY = focus.y * z + ry;
      if (screenX < marginX) rx = Math.min(maxX, rx + (marginX - screenX));
      else if (screenX > vpW - marginX) rx = Math.max(minX, rx - (screenX - (vpW - marginX)));
      if (screenY < marginY) ry = Math.min(maxY, ry + (marginY - screenY));
      else if (screenY > vpH - marginY) ry = Math.max(minY, ry - (screenY - (vpH - marginY)));
    }
    return { x: rx, y: ry, z };
  };

  useEffect(() => {
    if (!viewportRef.current || !cameraLayerRef.current || pointers.current.size > 0) return;
    const vp = viewportRef.current;
    const { zoom, x: curX, y: curY } = camState.current;
    const screenX = snappedPos.x * zoom + curX;
    const screenY = snappedPos.y * zoom + curY;
    const marginX = vp.clientWidth * 0.20;
    const marginY = vp.clientHeight * 0.20;
    let targetX = curX;
    let targetY = curY;
    let moved = false;
    if (screenX < marginX) { targetX = curX + (marginX - screenX); moved = true; }
    else if (screenX > vp.clientWidth - marginX) { targetX = curX - (screenX - (vp.clientWidth - marginX)); moved = true; }
    const vpH = vp.clientHeight;
    if (screenY < marginY) { targetY = curY + (marginY - screenY); moved = true; }
    else if (screenY > vpH - marginY) { targetY = curY - (screenY - (vpH - marginY)); moved = true; }
    if (moved) {
      const c = clampCamera(targetX, targetY, camState.current.zoom, snappedPos, 0.20);
      gsap.to(cameraLayerRef.current, { x: c.x, y: c.y, duration: 0.45, ease: "power3.out", onComplete: () => { camState.current.x = c.x; camState.current.y = c.y; } });
    }
  }, [snappedPos]);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAutoFollow(false);
    gsap.killTweensOf(cameraLayerRef.current);
    camState.current.x = gsap.getProperty(cameraLayerRef.current, "x") as number;
    camState.current.y = gsap.getProperty(cameraLayerRef.current, "y") as number;
    if (pointers.current.size === 1) lastPointer.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1 && lastPointer.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      const nx = camState.current.x + dx;
      const ny = camState.current.y + dy;
      const c = clampCamera(nx, ny, camState.current.zoom, snappedPos, 0.05);
      gsap.set(cameraLayerRef.current, { x: c.x, y: c.y });
      camState.current.x = c.x;
      camState.current.y = c.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
  };

  const handleRecenter = () => { setAutoFollow(true); gsap.to(map3DRef.current, { rotateZ: 0, rotateX: FIXED_PITCH, duration: 0.8 }); };
  const handleZoom = (dir: "in" | "out") => {
    setAutoFollow(false);
    const nz = dir === "in" ? camState.current.zoom * 1.35 : camState.current.zoom / 1.35;
    const c = clampCamera(camState.current.x, camState.current.y, nz, snappedPos, 0.05);
    gsap.to(cameraLayerRef.current, { scale: c.z, x: c.x, y: c.y, duration: 0.4 });
    camState.current.zoom = c.z;
    camState.current.x = c.x;
    camState.current.y = c.y;
  };

  if (!originId || !destId) return <div style={{ padding: 20, color: "#374151" }}>Invalid Route</div>;

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif" }}>
      {isNavActive && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 6, background: "rgba(0,0,0,0.05)", zIndex: 1000 }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #4285F4, #34A853)" }} />
        </div>
      )}

      <button onClick={() => setIsRecalibrating(true)} style={{ position: "absolute", right: 20, top: 80, width: 50, height: 50, borderRadius: "50%", background: "white", border: "none", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, cursor: "pointer" }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>
      </button>

      {isRecalibrating && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000 }}>
          <QRScanner onScan={handleQrRecalibrate} onClose={() => setIsRecalibrating(false)} />
        </div>
      )}

      <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div ref={viewportRef} style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}
          onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp}>
          <div ref={map3DRef} style={{ width: "100%", height: "100%" }}>
            <div ref={cameraLayerRef} style={{ position: "absolute", inset: 0, transformOrigin: "0 0" }}>
              <TestMap routePath={routePath} actualPath={actualPath} isDeviated={isDeviated} floorData={typedTestData} />
              {destinationMarkers.map((dest) => (
                <div key={dest.name} onClick={() => dest.pic && setSelectedDestination({ name: dest.name, pic: dest.pic })}
                  style={{ position: "absolute", left: dest.x, top: dest.y, transform: "translate(-50%, -100%)", background: "white", padding: "4px 8px", borderRadius: 8, fontSize: 12, fontWeight: 600, border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.05)", whiteSpace: "nowrap" }}>
                  📍 {dest.name}
                </div>
              ))}
              <div style={{ position: "absolute", left: snappedPos.x, top: snappedPos.y, transform: `translate(-50%, -50%) rotate(${heading}deg)`, zIndex: 30 }}>
                <svg width="48" height="48" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="15" fill="#4285F4" stroke="white" strokeWidth="3" />
                  <path d="M50 20 L65 45 L35 45 Z" fill="#4285F4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isNavActive && navState.turnType !== "straight" && (
        <div style={{ position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)", background: "white", padding: "12px 24px", borderRadius: 16, boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 100, display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#4285F4", display: "flex", alignItems: "center", justifyContent: "center" }}>
             {navState.turnType === "left" ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>}
          </div>
          <div style={{ fontWeight: 700, color: "#1e293b" }}>
            {navState.turnType === "finish" ? `Arrive in ${Math.round(navState.distToTurn)}m` : `Turn ${navState.turnType} in ${Math.round(navState.distToTurn)}m`}
          </div>
        </div>
      )}

      <MapControls onRecenter={handleRecenter} onZoomIn={() => handleZoom("in")} onZoomOut={() => handleZoom("out")} autoFollow={autoFollow} isMuted={isMuted} setIsMuted={setIsMuted} />

      <NavigationMenu isNavActive={isNavActive} onStartNavigation={startNavigation} onStopNavigation={() => setIsNavActive(false)} onPrevStep={handlePrevStep} onNextStep={handleNextStep} destName={rawDest || undefined} totalRem={navState.totalRem} currentSpeed={_currentSpeed} />

      {locationToConfirm && <LocationConfirmCard room={locationToConfirm.name} image={`/${locationToConfirm.pic}`} onConfirm={handleConfirmLocation} onReject={handleRejectLocation} />}
      {showTurnPopup && isPaused && <TurnConfirmCard onConfirm={handleConfirmTurn} onReject={handleSkipTurn} />}
      
      {selectedDestination && (
        <div onClick={() => setSelectedDestination(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: "white", padding: 24, borderRadius: 24, boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxWidth: "90vw" }}>
            <h3 style={{ margin: "0 0 16px", color: "#1e293b" }}>{selectedDestination.name}</h3>
            {selectedDestination.pic && <img src={`/${selectedDestination.pic}`} alt={selectedDestination.name} style={{ maxWidth: "100%", maxHeight: "65vh", borderRadius: 12 }} />}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;

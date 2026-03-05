import {
  useMemo,
  useState,
  useEffect,
  useRef,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import gsap from "gsap";
import TestMap from "../components/map/testMap";
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/usePDR";
import { applyCRFConstraints } from "../utils/mapMatching";

import MapHeader from "../components/map-view/MapHeader";
import MapControls from "../components/map-view/MapControls";
import NavigationMenu from "../components/map-view/NavigationMenu";
import LocationConfirmCard from "../components/map-view/LocationConfirmCard";
import TurnConfirmCard from "../components/map-view/TurnConfirmCard";

// Types
interface DestinationData { node: string; pic: string }
interface TestData {
  meta: { building: string; floor: string; floorName: string; svg: string };
  nodes: Record<string, { x: number; y: number; type: string }>;
  destinations: Record<string, DestinationData>;
}
type NodeType = { x: number; y: number; type: string };

const typedTestData = testData as TestData;
const MAP_W = 4101;
const MAP_H = 3025;
const FIXED_PITCH = 50; // locked 3D tilt
const ZOOM_MULT = 2.3; // multiplier to make initial view more zoomed in

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavActive, setIsNavActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = useMemo(
    () => Object.fromEntries(
      Object.entries(typedTestData.destinations).map(([k, v]) => [k, v.node]),
    ) as Record<string, string>,
    [],
  );
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;
  const nodeMap = useMemo(() => typedTestData.nodes as Record<string, NodeType>, []);

  const destinationMarkers = useMemo(() => {
    return Object.entries(destinations)
      .map(([name, id]) => {
        const node = nodeMap[id];
        if (!node) return null;
        return { name, x: node.x, y: node.y, id, pic: typedTestData.destinations[name]?.pic };
      })
      .filter((i): i is { name: string; x: number; y: number; id: string; pic: string } => i !== null);
  }, [destinations, nodeMap]);

  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

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

  useEffect(() => { setActualPath([]); setIsDeviated(false); }, [routePath]);
  useEffect(() => { setStepIndex(0); }, [routePath]);

  const { rawPos, heading, forceSetPos, currentSpeed: _currentSpeed } = usePDR(startNode.x, startNode.y, isNavActive, 0, routePath, isPaused);

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

  const snapResult = useMemo(() => applyCRFConstraints(rawPos.x, rawPos.y, routePath), [rawPos, routePath]);
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
      totalRem += Math.hypot(n1.x - n2.x, n1.y - n2.y);
    }
    const PX_PER_M = 50;
    return { turnType, distToTurn: Math.max(0, distToTurn / PX_PER_M), totalRem: Math.max(0, totalRem / PX_PER_M) };
  }, [snappedPos, routePath, nodeMap]);

  const lastSpokenInstruction = useRef<string | null>(null);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (isMuted) { synth?.cancel(); return; }
    if (!isNavActive) return;
    const { turnType, distToTurn } = navState;
    if (distToTurn > 30) { lastSpokenInstruction.current = null; return; }
    if (!synth) return;
    const speak = (text: string) => {
      if (lastSpokenInstruction.current === text) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      synth.speak(u);
      lastSpokenInstruction.current = text;
    };
    if (turnType === "finish") {
      if (distToTurn < 8) speak("You have arrived");
      else if (distToTurn < 20 && distToTurn > 10) speak("Destination is ahead in 15 meters");
      return;
    }
    if (distToTurn <= 40) {
      let q = distToTurn > 20 ? Math.round(distToTurn / 10) * 10 : Math.round(distToTurn / 5) * 5;
      if (q === 0) q = 5;
      const phrases = [`In ${q} meters, turn ${turnType}`, `Turn ${turnType} in ${q} meters`, `Upcoming ${turnType} turn in ${q} meters`];
      speak(phrases[q % phrases.length]);
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

  useEffect(() => { if (isNavActive) shownDestinations.current.clear(); }, [isNavActive]);

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

  const handleReroute = () => {
    let minD = Infinity;
    let closestId = "";
    Object.entries(nodeMap).forEach(([id, node]) => {
      const d = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
      if (d < minD) { minD = d; closestId = id; }
    });
    if (closestId) navigate(`/map?origin=${closestId}&dest=${destId}`);
  };

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

  // GSAP Camera
  const camState = useRef({ x: 0, y: 0, zoom: 1, bearing: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);
  const map3DRef = useRef<HTMLDivElement>(null);
  const cameraLayerRef = useRef<HTMLDivElement>(null);
  const [autoFollow, setAutoFollow] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const initialGesture = useRef<{ dist: number; angle: number; bearing: number } | null>(null);

  // Dynamic bounding-box zoom
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
      const padding = 120; // reduced padding for a tighter, more zoomed-in view
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

  // Auto-follow
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

  const clampCamera = (nx: number, ny: number, nz: number) => {
    const vp = viewportRef.current;
    if (!vp) return { x: nx, y: ny, z: nz };
    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;
    const minZoom = Math.max(vpW / MAP_W, vpH / MAP_H);
    const z = Math.max(nz, minZoom);
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
    return { x: rx, y: ry, z };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAutoFollow(false);
    gsap.killTweensOf(cameraLayerRef.current);
    camState.current.x = gsap.getProperty(cameraLayerRef.current, "x") as number;
    camState.current.y = gsap.getProperty(cameraLayerRef.current, "y") as number;
    if (pointers.current.size === 1) {
      lastPointer.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      const pts = Array.from(pointers.current.values());
      initialGesture.current = {
        dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
        angle: Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x),
        bearing: camState.current.bearing,
      };
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1 && lastPointer.current) {
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      const rad = (camState.current.bearing * Math.PI) / 180;
      const cos = Math.cos(rad);
      const sin = Math.sin(rad);
      const nx = camState.current.x + dx * cos + dy * sin;
      const ny = camState.current.y + dy * cos - dx * sin;
      const c = clampCamera(nx, ny, camState.current.zoom);
      gsap.set(cameraLayerRef.current, { x: c.x, y: c.y });
      camState.current.x = c.x;
      camState.current.y = c.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2 && initialGesture.current) {
      const pts = Array.from(pointers.current.values());
      const angle = Math.atan2(pts[1].y - pts[0].y, pts[1].x - pts[0].x);
      const rot = (angle - initialGesture.current.angle) * (180 / Math.PI);
      const newBearing = initialGesture.current.bearing + rot;
      gsap.set(map3DRef.current, { rotateZ: newBearing });
      camState.current.bearing = newBearing;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as Element).releasePointerCapture(e.pointerId);
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) initialGesture.current = null;
    if (pointers.current.size === 1) {
      const p = Array.from(pointers.current.values())[0];
      lastPointer.current = { x: p.x, y: p.y };
    }
  };

  const handleRecenter = () => {
    setAutoFollow(true);
    camState.current.bearing = 0;
    gsap.to(map3DRef.current, { rotateZ: 0, rotateX: FIXED_PITCH, duration: 0.8, ease: "power2.inOut" });
  };

  const handleZoom = (dir: "in" | "out") => {
    setAutoFollow(false);
    const { zoom, x, y } = camState.current;
    const nz = dir === "in" ? zoom * 1.35 : zoom / 1.35;
    const c = clampCamera(x, y, nz);
    gsap.to(cameraLayerRef.current, { scale: c.z, x: c.x, y: c.y, duration: 0.4, ease: "power3.out" });
    camState.current.zoom = c.z;
    camState.current.x = c.x;
    camState.current.y = c.y;
  };

  if (!originId || !destId) return <div style={{ padding: 20, color: "#374151" }}>Invalid Route</div>;

  return (
    <div style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#E8EAED", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* Full-screen Map Canvas */}
      <div
        ref={viewportRef}
        style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#F0F2F5", touchAction: "none" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div ref={map3DRef} style={{ width: "100%", height: "100%", transformStyle: "preserve-3d" as const, willChange: "transform" }}>
          <div ref={cameraLayerRef} style={{ position: "absolute", inset: 0, transformOrigin: "0 0", willChange: "transform" }}>

            <TestMap routePath={routePath} actualPath={actualPath} isDeviated={isDeviated} />

            {destinationMarkers.map((dest) => {
              const dist = Math.hypot(snappedPos.x - dest.x, snappedPos.y - dest.y);
              const near = dist < 250;
              // compute dynamic label scale from camera zoom (clamped)
              const currentZoom = camState.current?.zoom ?? 1;
              // Much smaller base scale and tighter clamps for compact labels
              const labelScale = Math.max(0.45, Math.min(0.9, 0.7 * currentZoom));
              return (
                <div
                  key={dest.name}
                  onClick={() => dest.pic && setSelectedDestination({ name: dest.name, pic: dest.pic })}
                  style={{
                    position: "absolute", left: dest.x, top: dest.y,
                      transform: `translate(-50%, -100%) scale(${(near ? 0.85 : 0.7) * labelScale})`,
                      marginTop: -Math.round(8 * labelScale),
                      background: near ? "#4285F4" : "#fff",
                      color: near ? "#fff" : "#5F6368",
                      padding: `${Math.round(3 * labelScale)}px ${Math.round(6 * labelScale)}px`, borderRadius: Math.round(8 * labelScale),
                      boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
                      fontSize: Math.max(9, Math.round((near ? 10 : 8) * labelScale)), fontWeight: 600,
                    pointerEvents: "auto", cursor: dest.pic ? "pointer" : "default",
                    zIndex: 20, whiteSpace: "nowrap",
                    transition: "all 0.3s cubic-bezier(.4,0,.2,1)",
                      border: near ? "none" : "1px solid #DADCE0",
                    display: "flex", alignItems: "center", gap: 4,
                  }}
                >
                  {"\uD83D\uDCCD"} {dest.name}
                </div>
              );
            })}

            {/* User arrow */}
            <div style={{
              position: "absolute", left: snappedPos.x, top: snappedPos.y,
              transform: `translate(-50%, -50%) rotate(${heading}deg)`,
              transition: "transform 0.2s linear",
              zIndex: 30, pointerEvents: "none",
              filter: "drop-shadow(0 2px 6px rgba(66,133,244,0.4))",
            }}>
              <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
                <defs>
                  <radialGradient id="gVision" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(60 60) rotate(-90) scale(60)">
                    <stop offset="0%" stopColor="#4285F4" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4285F4" stopOpacity="0" />
                  </radialGradient>
                </defs>
                <path d="M60 60 L20 0 Q 60 -20 100 0 Z" fill="url(#gVision)" />
                <circle cx="60" cy="60" r="16" fill="white" />
                <circle cx="60" cy="60" r="11" fill="#4285F4" />
                <path d="M60 45 L69 57 L51 57 Z" fill="#4285F4" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Floating UI */}

      <MapHeader
        buildingName={typedTestData.meta.building}
        floorName={typedTestData.meta.floorName}
        onBack={() => navigate("/")}
      />

      {isNavActive && navState.turnType !== "straight" && (
        <div style={{
          position: "absolute", top: 80, left: "50%", transform: "translateX(-50%)",
          width: "min(420px, 88%)", background: "#fff", borderRadius: 16,
          padding: "14px 20px", boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          zIndex: 100, display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: navState.turnType === "finish" ? "#34A853" : "#4285F4",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            {navState.turnType === "finish" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
            ) : navState.turnType === "left" ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
            )}
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: "#202124" }}>
              {navState.turnType === "finish"
                ? `Arrive in ${Math.round(navState.distToTurn)}m`
                : `Turn ${navState.turnType} in ${Math.round(navState.distToTurn)}m`}
            </div>
            <div style={{ fontSize: 12, color: "#5F6368", marginTop: 2 }}>
              {Math.round(navState.totalRem)}m remaining
            </div>
          </div>
        </div>
      )}

      <MapControls
        onRecenter={handleRecenter}
        onZoomIn={() => handleZoom("in")}
        onZoomOut={() => handleZoom("out")}
        autoFollow={autoFollow}
        isMuted={isMuted}
        setIsMuted={setIsMuted}
      />

      {isDeviated && (
        <div style={{
          position: "absolute", top: isNavActive && navState.turnType !== "straight" ? 148 : 80,
          left: "50%", transform: "translateX(-50%)",
          background: "#EA4335", color: "#fff", padding: "10px 20px",
          borderRadius: 24, fontWeight: 600, fontSize: 14,
          boxShadow: "0 2px 8px rgba(234,67,53,0.4)",
          display: "flex", alignItems: "center", gap: 10, zIndex: 200,
        }}>
          {"\u26A0\uFE0F"} Off Route
          <button onClick={handleReroute} style={{
            background: "#fff", color: "#EA4335", border: "none",
            padding: "5px 14px", borderRadius: 14, fontWeight: 700, fontSize: 13, cursor: "pointer",
          }}>
            Reroute
          </button>
        </div>
      )}

      <NavigationMenu
        isNavActive={isNavActive}
        onStartNavigation={startNavigation}
        onStopNavigation={() => setIsNavActive(false)}
        onPrevStep={handlePrevStep}
        onNextStep={handleNextStep}
      />

      {locationToConfirm && (
        <LocationConfirmCard
          room={locationToConfirm.name}
          image={`/${locationToConfirm.pic}`}
          onConfirm={handleConfirmLocation}
          onReject={handleRejectLocation}
        />
      )}

      {showTurnPopup && isPaused && (
        <TurnConfirmCard onConfirm={handleConfirmTurn} onReject={handleSkipTurn} />
      )}

      {selectedDestination && (
        <div
          onClick={() => setSelectedDestination(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)",
            display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300,
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{
            background: "#fff", padding: 20, borderRadius: 20,
            maxWidth: "90vw", maxHeight: "85vh", position: "relative",
            boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
          }}>
            <button onClick={() => setSelectedDestination(null)} style={{
              position: "absolute", top: 10, right: 14,
              background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#5F6368",
            }}>{"\u2715"}</button>
            <h3 style={{ margin: "0 0 12px", fontSize: 18, color: "#202124" }}>{selectedDestination.name}</h3>
            <img
              src={`/${selectedDestination.pic}`}
              alt={selectedDestination.name}
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 12 }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default MapView;

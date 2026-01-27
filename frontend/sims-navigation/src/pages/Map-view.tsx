import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import TestMap from "../components/map/testMap"; // ✅ USE YOUR EXISTING TESTMAP
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/userPDR";

// --- Styles Object (Inline CSS) ---
// Color Palette
const colors = {
  primary: "#1E293B",
  primaryDark: "#0F172A",
  secondary: "#10B981",
  accent: "#3B82F6",
  background: "#F8FAFC",
  surface: "#FFFFFF",
  text: "#1E293B",
  textSecondary: "#64748B",
  lightBlue: "#F0F9FF",
  lightGreen: "#ECFDF5",
  lightPurple: "#FAF5FF",
};

const styles: Record<string, CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    width: "100%",
    background: colors.primary,
    fontFamily:
      '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    overflow: "hidden",
    position: "fixed",
    inset: 0,
  },
  header: {
    background: colors.surface,
    padding: "16px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    zIndex: 30,
    flexShrink: 0,
    borderBottom: `1px solid ${colors.primary}`,
  },
  headerTitle: {
    fontSize: "18px",
    fontWeight: 700,
    color: colors.primaryDark,
    margin: 0,
    lineHeight: 1.2,
  },
  headerSubtitle: {
    fontSize: "14px",
    color: colors.secondary,
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  mapSection: {
    flex: 1,
    width: "100%",
    height: "100%",
    position: "relative",
    backgroundColor: colors.background,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },

  // ✅ viewport frame
  viewport: {
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    borderRadius: "16px",
    cursor: "grab",
    touchAction: "none",
  },

  // ✅ camera layer (we move this using translate + scale)
  camera: {
    position: "absolute",
    inset: 0,
    transformOrigin: "0 0",
    transition: "transform 0.25s ease",
    willChange: "transform",
  },

  floorPill: {
    position: "absolute",
    top: "20px",
    right: "20px",
    backgroundColor: colors.primary,
    padding: "8px 16px",
    borderRadius: "50px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    fontWeight: 700,
    color: colors.surface,
    fontSize: "14px",
    zIndex: 10,
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },

  zoomControls: {
    position: "absolute",
    bottom: "280px",
    right: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    zIndex: 50, // Increased z-index
  },
  zoomBtn: {
    width: "40px",
    height: "40px",
    borderRadius: "12px",
    backgroundColor: colors.surface,
    border: `1px solid ${colors.secondary}`,
    color: colors.text,
    fontSize: "20px",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
    userSelect: "none",
  },

  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: "24px",
    borderTopRightRadius: "24px",
    padding: "20px 18px 26px 18px",
    boxShadow: "0 -4px 20px rgba(0,0,0,0.15)",
    zIndex: 30,
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    borderTop: `4px solid ${colors.primary}`,
    maxHeight: "40vh",
    overflowY: "auto",
  },

  infoRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
  },

  distanceBadge: {
    background: colors.accent,
    color: colors.surface,
    padding: "6px 14px",
    borderRadius: "20px",
    fontWeight: 700,
    fontSize: "14px",
    boxShadow: `0 2px 6px rgba(59,130,246, 0.3)`,
    display: "flex",
    alignItems: "center",
    gap: "6px",
    whiteSpace: "nowrap",
  },

  locationsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr auto 1fr",
    alignItems: "center",
    gap: "12px",
    backgroundColor: colors.lightGreen,
    padding: "14px",
    borderRadius: "16px",
    border: `1px solid ${colors.secondary}`,
  },
  locationNode: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: 0,
  },
  label: {
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    color: colors.secondary,
    fontWeight: 600,
  },
  value: {
    fontSize: "15px",
    fontWeight: 600,
    color: colors.text,
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    maxWidth: "140px",
  },
  arrowIcon: {
    color: colors.primary,
    fontSize: "18px",
    fontWeight: 900,
  },

  actionsRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  btnSecondary: {
    padding: "14px",
    borderRadius: "14px",
    border: `1px solid ${colors.secondary}`,
    backgroundColor: colors.lightGreen,
    color: "#065F46",
    fontWeight: 700,
    fontSize: "15px",
    cursor: "pointer",
    textAlign: "center",
  },
  btnPrimary: {
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: colors.primary,
    color: colors.surface,
    fontWeight: 800,
    fontSize: "15px",
    cursor: "pointer",
    textAlign: "center",
    boxShadow: `0 4px 12px rgba(0,0,0, 0.25)`,
  },

  // Pointer movement pad
  pad: {
    display: "grid",
    gridTemplateColumns: "52px 52px 52px",
    gridTemplateRows: "52px 52px 52px",
    gap: "10px",
    justifyContent: "center",
    alignItems: "center",
    padding: "12px",
    borderRadius: "16px",
    background: colors.lightBlue,
    border: `1px solid ${colors.accent}`,
  },
  padBtn: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    border: `1px solid rgba(30,41,59,0.15)`,
    background: colors.surface,
    cursor: "pointer",
    fontSize: "18px",
    fontWeight: 900,
    color: colors.primary,
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    userSelect: "none",
  },
  padEmpty: { width: "52px", height: "52px" },

  pointerDot: {
    position: "absolute",
    width: "18px",
    height: "18px",
    borderRadius: "50%",
    background: "#F97316",
    border: "3px solid white",
    boxShadow: "0 6px 16px rgba(0,0,0,0.25)",
    zIndex: 20,
    transform: "translate(-50%, -50%)",
    pointerEvents: "none",
  },
};

type NodeType = { x: number; y: number; type: string };

// ✅ map coordinate system from your svg viewBox
// const MAP_W = 4101;
// const MAP_H = 3025;

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavActive, setIsNavActive] = useState(false);

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = testData.destination as Record<string, string>;
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;

  const nodeMap = useMemo(() => testData.nodes as Record<string, NodeType>, []);

  // Compute the route path
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

  // Starting Coordinates
  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  // 1. PDR HOOK (Integrated with CRF)
  const { rawPos, heading, forceSetPos, resetHeading } = usePDR(
    startNode.x,
    startNode.y,
    isNavActive,
    routePath,
    nodeMap
  );
  
  // 2. Snapped position is now baked into the PDR result
  const snappedPos = rawPos;
  const relativeHeading = heading; // ✅ heading is already relative now

  // Calculate navigation instructions & Total Distance
  const navigationState = useMemo(() => {
    if (!routePath.length || !snappedPos) return null;
    
    // 1. Calculate Total Route Distance (Origin -> Destination)
    let totalDistancePixels = 0;
    for (let i = 0; i < routePath.length - 1; i++) {
        const n1 = nodeMap[routePath[i]];
        const n2 = nodeMap[routePath[i+1]];
        if (n1 && n2) {
            totalDistancePixels += Math.hypot(n2.x - n1.x, n2.y - n1.y);
        }
    }
    const totalDistanceMeters = (totalDistancePixels / 49).toFixed(1); // 49px = 1m

    // 2. Find current segment and next instruction
    let currentSegment = 0;
    let minDist = Infinity;
    
    for (let i = 0; i < routePath.length - 1; i++) {
      const node1 = nodeMap[routePath[i]];
      const node2 = nodeMap[routePath[i + 1]];
      if (!node1 || !node2) continue;
      
      // Distance from point to line segment
      const dx = node2.x - node1.x;
      const dy = node2.y - node1.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      if (length === 0) continue;
      
      const t = Math.max(0, Math.min(1, ((snappedPos.x - node1.x) * dx + (snappedPos.y - node1.y) * dy) / (length * length)));
      const projX = node1.x + t * dx;
      const projY = node1.y + t * dy;
      const dist = Math.sqrt((snappedPos.x - projX) ** 2 + (snappedPos.y - projY) ** 2);
      
      if (dist < minDist) {
        minDist = dist;
        currentSegment = i;
      }
    }
    
    const nextNode = nodeMap[routePath[currentSegment + 1]];
    if (!nextNode) return { instruction: "You have arrived!", distance: 0, totalDistance: totalDistanceMeters };
    
    const distance = Math.sqrt((nextNode.x - snappedPos.x) ** 2 + (nextNode.y - snappedPos.y) ** 2);
    const pixelsToMeters = 1 / 49; // 1m = 49px
    const distanceMeters = distance * pixelsToMeters;
    
    return {
      instruction: `Continue to ${routePath[currentSegment + 1]}`,
      distance: distanceMeters,
      totalDistance: totalDistanceMeters,
      nextNode: routePath[currentSegment + 1]
    };
  }, [routePath, snappedPos, nodeMap]);

  // Manual Permission Trigger
  const startNavigation = async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res !== "granted") return;
      }
  
      if (typeof (DeviceOrientationEvent as any).requestPermission === "function") {
        const res2 = await (DeviceOrientationEvent as any).requestPermission();
        if (res2 !== "granted") return;
      }
  
      // ✅ CALIBRATE: Save current heading as base heading for relative navigation
      resetHeading(); // ✅ calibrates relative heading fresh
      setIsNavActive(true);
    } catch (err) {
      console.log("Permission error:", err);
    }
  };

  // ✅ Step-by-Step "Play" Feature: Teleport PDR to next node
  const handlePlayNextNode = () => {
    // Find which node we are closest to in the path
    let closestIdx = 0;
    let minD = Infinity;
    routePath.forEach((id, idx) => {
      const n = nodeMap[id];
      const d = Math.hypot(snappedPos.x - n.x, snappedPos.y - n.y);
      if (d < minD) { minD = d; closestIdx = idx; }
    });

    const nextNodeId = routePath[closestIdx + 1];
    if (nextNodeId) {
      const nextNode = nodeMap[nextNodeId];
      forceSetPos(nextNode.x, nextNode.y); // Updates PDR and Camera
      setIsFollowing(true); // Snap camera to new position
    }
  };

  // camera follow logic
  const [zoom, setZoom] = useState(0.6);
  const [isFollowing, setIsFollowing] = useState(true);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  
  // Dragging Refs
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Pinch Zoom Refs
  const [isPinching, setIsPinching] = useState(false);
  const initialDistance = useRef(0);
  const initialZoom = useRef(0);

  // 1. Follow User Effect (Only when isFollowing is true)
  useEffect(() => {
    if (!isFollowing) return;
    const vp = viewportRef.current;
    if (!vp) return;
    setCamera({ 
      x: vp.clientWidth / 2 - snappedPos.x * zoom, 
      y: vp.clientHeight / 2 - snappedPos.y * zoom 
    });
  }, [snappedPos, zoom, isFollowing]);

  // 2. Auto-follow when navigation starts
  useEffect(() => {
    if (isNavActive) {
      setIsFollowing(true);
    }
  }, [isNavActive]);

  // Navigation feedback (Vibration)
  useEffect(() => {
    if (!isNavActive || !navigationState) return;

    const distance = navigationState.distance;

    // Vibrate when close to next waypoint
    if (distance < 3 && distance > 0.5) {
      if (window.navigator.vibrate) {
        window.navigator.vibrate([100, 50, 100]); // Double vibration
      }
    }

    // Arrived at destination
    if (distance < 0.5) {
      if (window.navigator.vibrate) {
        window.navigator.vibrate([200, 100, 200, 100, 200]); // Success pattern
      }
    }
  }, [navigationState, isNavActive]);

  // 3. Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    setIsFollowing(false); // Unlock camera
    if (followTimeoutRef.current) {
      clearTimeout(followTimeoutRef.current);
      followTimeoutRef.current = null;
    }
    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setCamera(prev => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    // Start dynamic following after 2 seconds of no panning
    followTimeoutRef.current = setTimeout(() => {
      setIsFollowing(true);
    }, 2000);
  };

  // 4. Zoom Handlers
  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 4.0));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.2));
  const handleRecenter = () => setIsFollowing(true);

  // Helper: Get distance between two touches
  const getDistance = (touches: React.TouchList) => {
    const touch1 = touches[0];
    const touch2 = touches[1];
    return Math.sqrt(
      (touch1.clientX - touch2.clientX) ** 2 + (touch1.clientY - touch2.clientY) ** 2
    );
  };

  // Pinch Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      initialDistance.current = getDistance(e.touches);
      initialZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault(); // Prevent page zoom/scroll
      const newDistance = getDistance(e.touches);
      const rawScale = newDistance / initialDistance.current;
      const scale = Math.pow(rawScale, 0.7); // Reduce sensitivity by using fractional power
      const newZoom = Math.max(0.2, Math.min(4.0, initialZoom.current * scale));
      setZoom(newZoom);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      setIsPinching(false);
    }
  };

  if (!originId || !destId) return <div>Invalid Route</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>{isNavActive ? "Navigation Active" : "Direction Sensing"}</h1>
        <div style={styles.headerSubtitle}>
          <span style={{ color: isNavActive ? "#22C55E" : "#F59E0B" }}>●</span> 
          {isNavActive ? "Live Sensors Tracking" : `Pointing: ${relativeHeading.toFixed(0)}°`}
        </div>
      </header>

      <div style={styles.mapSection}>
        {/* Floating Zoom Controls */}
        <div style={styles.zoomControls}>
          <button style={styles.zoomBtn} onClick={handleZoomIn}>+</button>
          <button style={styles.zoomBtn} onClick={handleZoomOut}>-</button>
          <button style={{...styles.zoomBtn, fontSize: '14px'}} onClick={handleRecenter}>
            ◉
          </button>
        </div>

        <div 
          ref={viewportRef} 
          style={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp} // Safety release
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* CAMERA LAYER */}
          <div style={{
            ...styles.camera,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
          }}>
            <TestMap routePath={routePath} />

            {/* Next Waypoint Indicator */}
            {navigationState && navigationState.nextNode && (
              <div style={{
                position: "absolute",
                left: nodeMap[navigationState.nextNode]?.x || 0,
                top: nodeMap[navigationState.nextNode]?.y || 0,
                transform: "translate(-50%, -50%)",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
                border: "3px solid white",
                boxShadow: "0 0 15px rgba(16, 185, 129, 0.7)",
                zIndex: 15,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                color: "white",
              }}>
                <div>{navigationState.distance.toFixed(0)}m</div>
                <div style={{fontSize: '9px'}}>Left: {navigationState.totalDistance}m</div>
              </div>
            )}

            {/* LIVE POINTER WITH DIRECTION OF SIGHT - Always visible, shows where user is pointing */}
            <div style={{
              position: "absolute",
              left: snappedPos.x,
              top: snappedPos.y,
              transform: `translate(-50%, -50%) rotate(${relativeHeading}deg)`,
              transition: 'all 0.2s linear',
              zIndex: 25,
              pointerEvents: "none",
              opacity: isNavActive ? 1 : 0.6, // Slightly transparent when not navigating
            }}>
              {/* 1. The Vision Beam */}
              <div style={{
                position: "absolute",
                bottom: "50%",
                left: "50%",
                transform: "translateX(-50%)",
                width: "120px",
                height: "160px",
                background: "linear-gradient(to top, rgba(59, 130, 246, 0.5) 0%, rgba(59, 130, 246, 0) 100%)",
                clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
                zIndex: 24,
              }} />

              {/* 2. The Main User Dot */}
              <div style={{
                ...styles.pointerDot,
                position: "relative",
                left: 0,
                top: 0,
                transform: "translate(-50%, -50%)",
                background: '#3B82F6',
                border: "3px solid white",
                boxShadow: "0 0 15px rgba(59, 130, 246, 0.5)",
                zIndex: 26,
              }}>
                {/* 3. Tiny Directional Arrow */}
                <div style={{
                  width: 0,
                  height: 0,
                  borderLeft: "5px solid transparent",
                  borderRight: "5px solid transparent",
                  borderBottom: "8px solid white",
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -80%)", 
                }} />
              </div>
            </div>
          </div> {/* <--- THIS was the missing closing tag for styles.camera */}
        </div>

        {/* UI OVERLAY (Bottom Sheet) */}
        <div style={styles.bottomSheet}>
          <div style={styles.infoRow}>
            {!isNavActive ? (
              <button style={{...styles.btnPrimary, width: '100%'}} onClick={startNavigation}>
                🚀 START LIVE TRACKING
              </button>
            ) : (
              <div style={styles.distanceBadge}>
                {navigationState ?
                  `${navigationState.instruction} (${navigationState.distance.toFixed(1)}m)` :
                  "📍 Navigation Ready"
                }
              </div>
            )}
          </div>

          <div style={styles.pad}>
            <div style={styles.padEmpty} />
            <button style={styles.padBtn} onClick={() => forceSetPos(rawPos.x, rawPos.y - 50)}>⬆</button>
            <div style={styles.padEmpty} />

            <button style={styles.padBtn} onClick={() => forceSetPos(rawPos.x - 50, rawPos.y)}>⬅</button>
            
            <button 
              style={{...styles.padBtn, background: colors.primary, color: "white"}} 
              onClick={handlePlayNextNode}
            >▶</button>
            
            <button style={styles.padBtn} onClick={() => forceSetPos(rawPos.x + 50, rawPos.y)}>➡</button>

            <div style={styles.padEmpty} />
            <button style={styles.padBtn} onClick={() => forceSetPos(rawPos.x, rawPos.y + 50)}>⬇</button>
            <div style={styles.padEmpty} />
          </div>

          <div style={styles.actionsRow}>
            <button style={styles.btnSecondary} onClick={() => navigate("/navigation")}>← Back</button>
            <button style={styles.btnPrimary} onClick={() => {
              forceSetPos(startNode.x, startNode.y);
              setIsFollowing(true);
            }}>Reset Pos</button>
          </div>

          {/* CRF Data Section */}
          <div style={{
            marginTop: "12px",
            padding: "12px",
            backgroundColor: colors.lightBlue,
            borderRadius: "12px",
            border: `1px solid ${colors.accent}`,
            fontSize: "12px",
            color: colors.textSecondary,
            textAlign: "center",
          }}>
            <div>📍 Position: X:{snappedPos.x.toFixed(0)} Y:{snappedPos.y.toFixed(0)}</div>
            <div>🧭 Direction: {relativeHeading.toFixed(0)}°</div>
            <div>🔍 Zoom: {(zoom * 100).toFixed(0)}%</div>
            {routePath.length > 0 && (
              <div>📊 Progress: {Math.round(((routePath.findIndex(id => id === navigationState?.nextNode) || 0) / routePath.length) * 100)}%</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
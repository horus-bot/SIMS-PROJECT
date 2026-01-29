import {
  useMemo,
  useState,
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import TestMap from "../components/map/testMap"; 
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/usePDR";
import { applyCRFConstraints } from "../utils/mapMatching";

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
    overflow: "auto",
    position: "relative",
    inset: "initial",
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

  popupOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  popup: {
    background: "white",
    padding: "24px",
    borderRadius: "16px",
    width: "85%",
    maxWidth: "320px",
    textAlign: "center",
    boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
  },
  popupTitle: {
    fontSize: "18px",
    fontWeight: "bold",
    marginBottom: "12px",
    color: "#1E293B",
  },
  popupText: {
    fontSize: "14px",
    color: "#64748B",
    marginBottom: "20px",
  },
  popupButtons: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
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

// Function to compute distance from point to polyline
const distanceToPolyline = (px: number, py: number, points: {x: number, y: number}[]) => {
  let minDist = Infinity;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = distanceToLineSegment(px, py, p1.x, p1.y, p2.x, p2.y);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
};

const distanceToLineSegment = (px: number, py: number, x1: number, y1: number, x2: number, y2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
};

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

  // Starting Coordinates
  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  // Dijkstra Route calculation (Still needed for the visual blue line)
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

  // 1. PDR HOOK (Integrated with initialMapAngle = 0 for POC logic)
  const [isPaused, setIsPaused] = useState(false);
  const { rawPos, heading, forceSetPos } = usePDR(startNode.x, startNode.y, isNavActive, 0, routePath, isPaused);

  // Turn Detection Logic
  const [showTurnPopup, setShowTurnPopup] = useState(false);
  const [pendingTurnNode, setPendingTurnNode] = useState<{id: string, x: number, y: number} | null>(null);
  const checkedTurns = useRef<Set<string>>(new Set());

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

        if (diff > 0.6) { // > ~35 degrees
            turns.push(routePath[i]);
        }
    }
    return turns;
  }, [routePath, nodeMap]);

  // 2. GLOBAL TUNNEL CONSTRAINTS (Updated: Removed routePath)
  // This now checks against ALL edges in test_1.json automatically
  const snapResult = useMemo(() => {
    return applyCRFConstraints(rawPos.x, rawPos.y, routePath);
  }, [rawPos, routePath]);
  
  const snappedPos = { x: snapResult.x, y: snapResult.y };

  // Calculate deviation - Now strictly based on whether mapMatching snapped to route or not
  useEffect(() => {
     if (isNavActive) {
         setIsDeviated(!snapResult.isOnRoute);
     }
  }, [snapResult, isNavActive]);

  useEffect(() => {
    if (!isNavActive || isPaused) return;

    for (const nodeId of turnNodes) {
        if (checkedTurns.current.has(nodeId)) continue;
        const node = nodeMap[nodeId];
        const dist = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        
        if (dist < 80) { // Trigger within 80px (approx 1.5m)
            setIsPaused(true);
            setPendingTurnNode({ id: nodeId, ...node });
            setShowTurnPopup(true);
            checkedTurns.current.add(nodeId);
            break; 
        }
    }
  }, [snappedPos, isNavActive, isPaused, turnNodes, nodeMap]);

  const handleConfirmTurn = () => {
    if (pendingTurnNode) {
        forceSetPos(pendingTurnNode.x, pendingTurnNode.y);
    }
    setShowTurnPopup(false);
    setIsPaused(false);
    setPendingTurnNode(null);
  };

  const handleSkipTurn = () => {
    setShowTurnPopup(false);
    setIsPaused(false);
    setPendingTurnNode(null);
  };

  // Track actual path and detect deviation
  useEffect(() => {
    if (!isNavActive || routePoints.length < 2) return;

    setActualPath(prev => {
      const last = prev[prev.length - 1];
      if (!last || Math.hypot(snappedPos.x - last.x, snappedPos.y - last.y) > 10) { // Add if moved >10px
        return [...prev, snappedPos];
      }
      return prev;
    });

    // Check deviation: if distance to route > 50px, deviated
    const dist = distanceToPolyline(snappedPos.x, snappedPos.y, routePoints);
    // Deprecated: setIsDeviated(dist > 50);
  }, [snappedPos, isNavActive, routePoints]);

  const handleReroute = () => {
    // 1. Find the closest node to current (deviated) pos
    let minD = Infinity;
    let closestId = "";
    Object.entries(nodeMap).forEach(([id, node]) => {
        const d = Math.hypot(snappedPos.x - node.x, snappedPos.y - node.y);
        if (d < minD) { minD = d; closestId = id; }
    });

    if (closestId) {
        // 2. Update origin to this new node (navigates to same page with new params)
        navigate(`/map?origin=${closestId}&dest=${destId}`);
    }
  };
  
  // Manual Permission Trigger
  const startNavigation = async () => {
    if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      try {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res === 'granted') setIsNavActive(true);
      } catch (e) {
        console.error("Sensor permission denied", e);
      }
    } else {
      setIsNavActive(true);
    }
    // Reset path on start
    setActualPath([]);
    setIsDeviated(false);
  };

  // ✅ Step-by-Step "Play" Feature
  const handlePlayNextNode = () => {
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
      forceSetPos(nextNode.x, nextNode.y);
    }
  };

  // Camera follow logic
  const [zoom] = useState(0.6);
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    
    setCamera({ 
      x: vp.clientWidth / 2 - snappedPos.x * zoom, 
      y: vp.clientHeight / 2 - snappedPos.y * zoom 
    });
  }, [snappedPos, zoom]);

  if (!originId || !destId) return <div style={{color: 'white', padding: '20px'}}>Invalid Route</div>;

  return (
    // ... (rest of your JSX)
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>{isNavActive ? "Navigation Active" : "Ready to Start"}</h1>
        <div style={styles.headerSubtitle}>
          <span style={{ color: isNavActive ? "#22C55E" : "#64748B" }}>●</span> 
          {isNavActive ? "Live Sensors Tracking" : "Waiting for activation"}
        </div>
      </header>

      <div style={styles.mapSection}>
        <div ref={viewportRef} style={styles.viewport}>
          {/* CAMERA LAYER */}
          <div style={{
            ...styles.camera,
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
          }}>
            <TestMap routePath={routePath} actualPath={actualPath} isDeviated={isDeviated} />

            {/* NEW POINTER */}
            <div style={{
              position: "absolute",
              left: snappedPos.x,
              top: snappedPos.y,
              transform: `translate(-50%, -50%) rotate(${heading}deg)`,
              transition: 'transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)', 
              zIndex: 30,
              pointerEvents: "none",
            }}>
                <svg width="100" height="100" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                   {/* Arrow Points UP by default (0 deg) */}
                   <path d="M50 10 L80 90 L50 70 L20 90 L50 10 Z" fill="#3B82F6" stroke="white" strokeWidth="4" strokeLinejoin="round" />
                   {/* Vision Cone */}
                   <path d="M50 50 L10 10 A 60 60 0 0 1 90 10 Z" fill="url(#vision)" fillOpacity="0.3" transform="translate(0, -10)"/>
                   <defs>
                     <linearGradient id="vision" x1="50" y1="50" x2="50" y2="0" gradientUnits="userSpaceOnUse">
                       <stop stopColor="#3B82F6" stopOpacity="0.6"/>
                       <stop offset="1" stopColor="#3B82F6" stopOpacity="0"/>
                     </linearGradient>
                   </defs>
                </svg>
            </div>
          </div> 
        </div>

        {/* Turn Correction Popup */}
        {showTurnPopup && isPaused && (
            <div style={styles.popupOverlay}>
                <div style={styles.popup}>
                    <div style={styles.popupTitle}>Check Position 📍</div>
                    <div style={styles.popupText}>
                        Are you at the <strong>Corner</strong>?
                        <br/>
                        <span style={{fontSize: '12px', opacity: 0.8}}>Re-align pointer to this corner?</span>
                    </div>
                    <div style={styles.popupButtons}>
                        <button style={{...styles.btnSecondary, minWidth: '80px', flex:1}} onClick={handleSkipTurn}>No (Skip)</button>
                        <button style={{...styles.btnPrimary, minWidth: '80px', flex:1}} onClick={handleConfirmTurn}>Yes (Align)</button>
                    </div>
                </div>
            </div>
        )}

        {/* Deviation Warning Overlay */}
        {isDeviated && (
            <div style={{
                position: "absolute", top: "100px", left: "50%", transform: "translateX(-50%)", 
                background: "#EF4444", color: "white", padding: "12px 24px", 
                borderRadius: "30px", fontWeight: "bold", zIndex: 60,
                boxShadow: "0 4px 12px rgba(239, 68, 68, 0.4)",
                display: "flex", alignItems: "center", gap: "10px"
            }}>
                <span>⚠️ Off Route!</span>
                <button 
                  onClick={handleReroute}
                  style={{
                      background: "white", color: "#EF4444", border: "none", 
                      padding: "6px 14px", borderRadius: "16px", fontWeight: "bold", cursor: "pointer"
                  }}
                >
                  Reroute ⟳
                </button>
            </div>
        )}

        {/* UI OVERLAY (Bottom Sheet) */}
        <div style={styles.bottomSheet}>
          <div style={styles.infoRow}>
            {!isNavActive ? (
              <button style={{...styles.btnPrimary, width: '100%'}} onClick={startNavigation}>
                🚀 START LIVE TRACKING
              </button>
            ) : (
              <div style={styles.distanceBadge}>📍 {originId} → {destId}</div>
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
            <button style={styles.btnPrimary} onClick={() => forceSetPos(startNode.x, startNode.y)}>Reset Pos</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;
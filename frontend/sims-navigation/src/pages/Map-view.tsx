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
import { usePDR } from "../hooks/userPDR";
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

  // Starting Coordinates
  const startNode = useMemo(() => nodeMap[originId || ""] || { x: 785, y: 924 }, [originId, nodeMap]);

  // 1. PDR HOOK (Integrated with CRF)
  const { rawPos, heading, forceSetPos } = usePDR(startNode.x, startNode.y, isNavActive, applyCRFConstraints);
  
  // 2. Snapped position is now baked into the PDR result
  const snappedPos = rawPos;

  // Dijkstra Route
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId);
  }, [originId, destId]);

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
    }
  };

  // camera follow logic
  const zoom = 0.6;
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

  if (!originId || !destId) return <div>Invalid Route</div>;

  return (
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
            <TestMap routePath={routePath} />

            {/* LIVE POINTER WITH DIRECTION OF SIGHT */}
            <div style={{
              position: "absolute",
              left: snappedPos.x,
              top: snappedPos.y,
              transform: `translate(-50%, -50%) rotate(${heading}deg)`,
              transition: 'all 0.2s linear',
              zIndex: 25,
              pointerEvents: "none",
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
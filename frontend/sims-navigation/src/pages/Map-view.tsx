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
type EdgeType = { from: string; to: string };

// ✅ map coordinate system from your svg viewBox
// const MAP_W = 4101;
// const MAP_H = 3025;

const MapView = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  // Resolve Aliases (e.g. "BW204" -> "node_001")
  const destinations = testData.destination as Record<string, string>;
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;

  if (!originId || !destId) {
    return (
      <div
        style={{
          ...styles.container,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ color: "#CBD5E1" }}>Invalid Route Parameters</p>
        <button
          onClick={() => navigate("/navigation")}
          style={{
            ...styles.btnSecondary,
            marginTop: "20px",
            width: "auto",
            padding: "10px 24px",
          }}
        >
          Go Back
        </button>
      </div>
    );
  }

  const nodeMap = useMemo(() => testData.nodes as Record<string, NodeType>, []);
  const edges = useMemo(() => testData.edges as EdgeType[], []);

  // Build adjacency (directed)
  const graph = useMemo(() => {
    const g: Record<string, string[]> = {};
    Object.keys(nodeMap).forEach((id) => (g[id] = []));
    edges.forEach((e) => {
      if (g[e.from] && nodeMap[e.to]) g[e.from].push(e.to);
    });
    return g;
  }, [nodeMap, edges]);

  // Current pointer node
  const [currentNode, setCurrentNode] = useState<string>(originId);

  useEffect(() => {
    setCurrentNode(originId);
  }, [originId]);

  // Zoom
  const [zoom, setZoom] = useState(0.6);

  // viewport ref
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // camera translate
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // Interaction Refs
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef<number | null>(null);

  // Handlers for Pan & Zoom
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
    (e.target as Element).setPointerCapture(e.pointerId);
    if (viewportRef.current) viewportRef.current.style.cursor = "grabbing";
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };

    setCamera((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as Element).releasePointerCapture(e.pointerId);
    if (viewportRef.current) viewportRef.current.style.cursor = "grab";
  };

  const handleWheel = (e: React.WheelEvent) => {
    // Zoom towards center of screen (simple implementation)
    // For more complex "zoom to mouse", we need to adjust camera x/y based on mouse offset
    const delta = -e.deltaY * 0.001; 
    const newZoom = Math.min(2.5, Math.max(0.4, zoom + delta));
    setZoom(newZoom);
  };

  // Touch handlers for pinch (React doesn't expose scale on PointerEvents easily)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDist.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const delta = dist - lastTouchDist.current;
      const newZoom = Math.min(2.5, Math.max(0.4, zoom + delta * 0.005));
      setZoom(newZoom);
      lastTouchDist.current = dist;
    }
  };

  const handleTouchEnd = () => {
    lastTouchDist.current = null;
  };

  // ✅ Route (Pathfinding Utility)
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId);
  }, [originId, destId]);

  const routeDistance = useMemo(() => {
    if (routePath.length < 2) return 0;
    let total = 0;
    for (let i = 0; i < routePath.length - 1; i++) {
      const a = nodeMap[routePath[i]];
      const b = nodeMap[routePath[i + 1]];
      if (!a || !b) continue;
      total += Math.hypot(a.x - b.x, a.y - b.y);
    }
    return Math.round(total);
  }, [routePath, nodeMap]);

  // ✅ move pointer
  const movePointer = (dir: "up" | "down" | "left" | "right") => {
    const cur = nodeMap[currentNode];
    if (!cur) return;

    const neighbors = graph[currentNode] || [];
    if (!neighbors.length) return;

    const best = neighbors
      .map((nid) => {
        const n = nodeMap[nid];
        if (!n) return null;
        const dx = n.x - cur.x;
        const dy = n.y - cur.y;

        let score = -Infinity;
        if (dir === "up") score = -dy - Math.abs(dx) * 0.35;
        if (dir === "down") score = dy - Math.abs(dx) * 0.35;
        if (dir === "left") score = -dx - Math.abs(dy) * 0.35;
        if (dir === "right") score = dx - Math.abs(dy) * 0.35;

        return { nid, score };
      })
      .filter(Boolean) as { nid: string; score: number }[];

    best.sort((a, b) => b.score - a.score);

    const next = best[0]?.nid;
    if (next) setCurrentNode(next);
  };

  // ✅ follow camera (Only on node change to allow panning)
  useEffect(() => {
    const vp = viewportRef.current;
    const node = nodeMap[currentNode];
    if (!vp || !node) return;

    const vpW = vp.clientWidth;
    const vpH = vp.clientHeight;

    const targetX = vpW / 2 - node.x * zoom;
    const targetY = vpH / 2 - node.y * zoom;

    // Clamping logic can be relaxed here if we want free scroll, but let's keep basic bounds
    // Or just set target directly
    setCamera({ x: targetX, y: targetY });
  }, [currentNode]); // Removed zoom dependency to allow manual zoom without snapping back

  return (
    <div style={styles.container}>
      <Header />

      <div style={styles.mapSection}>
        <div style={styles.floorPill}>
          🏢 Floor 1 <span style={{ opacity: 0.85 }}>SIMS</span>
        </div>

        {/* Zoom controls */}
        <div style={styles.zoomControls}>
          <button
            style={styles.zoomBtn}
            onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.2) * 100) / 100))}
            title="Zoom In"
          >
            +
          </button>
          <button
            style={styles.zoomBtn}
            onClick={() => setZoom((z) => Math.max(0.4, Math.round((z - 0.2) * 100) / 100))}
            title="Zoom Out"
          >
            −
          </button>
          <button
            style={styles.zoomBtn}
            onClick={() => setZoom(1)}
            title="Reset Zoom"
          >
            ⟳
          </button>
        </div>

        {/* ✅ VIEWPORT */}
        <div
          ref={viewportRef}
          style={styles.viewport}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* ✅ CAMERA */}
          <div
            style={{
              ...styles.camera,
              transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
            }}
          >
            {/* ✅ JUST USE TESTMAP COMPONENT */}
            <TestMap routePath={routePath} />

            {/* ✅ POINTER DOT */}
            {nodeMap[currentNode] && (
              <div
                style={{
                  ...styles.pointerDot,
                  left: nodeMap[currentNode].x,
                  top: nodeMap[currentNode].y,
                }}
              />
            )}
          </div>
        </div>

        {/* Bottom Sheet */}
        <div style={styles.bottomSheet}>
          <div style={styles.infoRow}>
            <div style={{ fontWeight: 800, color: colors.primaryDark }}>
              Navigation Overview
            </div>

            <div style={styles.distanceBadge}>📏 {routeDistance} px</div>
          </div>

          <div style={styles.locationsGrid}>
            <div style={styles.locationNode}>
              <div style={styles.label}>Origin</div>
              <div style={styles.value}>{originId}</div>
            </div>

            <div style={styles.arrowIcon}>→</div>

            <div style={styles.locationNode}>
              <div style={styles.label}>Destination</div>
              <div style={styles.value}>{destId}</div>
            </div>
          </div>

          {/* Pointer info */}
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <div style={{ color: colors.textSecondary, fontSize: 13 }}>
              👤 Current Pointer:
              <span
                style={{
                  fontWeight: 800,
                  marginLeft: 6,
                  color: colors.text,
                }}
              >
                {currentNode}
              </span>
            </div>

            <button
              style={{
                ...styles.btnSecondary,
                padding: "10px 14px",
                fontSize: 13,
              }}
              onClick={() => setCurrentNode(originId)}
            >
              Reset Pointer
            </button>
          </div>

          {/* Arrow pad */}
          <div style={styles.pad}>
            <div style={styles.padEmpty} />
            <button style={styles.padBtn} onClick={() => movePointer("up")}>
              ⬆
            </button>
            <div style={styles.padEmpty} />

            <button style={styles.padBtn} onClick={() => movePointer("left")}>
              ⬅
            </button>
            <button
              style={{
                ...styles.padBtn,
                background: colors.primary,
                color: "white",
                border: "none",
              }}
              onClick={() => {
                const idx = routePath.indexOf(currentNode);
                if (idx >= 0 && idx < routePath.length - 1) {
                  setCurrentNode(routePath[idx + 1]);
                }
              }}
            >
              ▶
            </button>
            <button style={styles.padBtn} onClick={() => movePointer("right")}>
              ➡
            </button>

            <div style={styles.padEmpty} />
            <button style={styles.padBtn} onClick={() => movePointer("down")}>
              ⬇
            </button>
            <div style={styles.padEmpty} />
          </div>

          <div style={styles.actionsRow}>
            <button
              style={styles.btnSecondary}
              onClick={() => navigate("/navigation")}
            >
              ← Back
            </button>
            <button
              style={styles.btnPrimary}
              onClick={() => navigate(`/map-view?origin=${originId}&dest=${destId}`)}
            >
              Keep Navigating
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Header = () => (
  <header style={styles.header}>
    <h1 style={styles.headerTitle}>Navigation Active</h1>
    <div style={styles.headerSubtitle}>
      <span style={{ color: "#22C55E" }}>●</span> Live Guidance
    </div>
  </header>
);

export default MapView;

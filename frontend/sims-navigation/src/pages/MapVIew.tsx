import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/userPDR";
import { useNodeLockedNavigation } from "../hooks/useNodeLockedNaviagtion";
import MapCanvas from "../components/navigation/MapCanvas";

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
};

type NodeType = { x: number; y: number; type: string };

export default function MapView() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isNavActive, setIsNavActive] = useState(false);

  const rawOrigin = searchParams.get("origin");
  const rawDest = searchParams.get("dest");

  const destinations = testData.destination as Record<string, string>;
  const originId = destinations[rawOrigin || ""] || rawOrigin;
  const destId = destinations[rawDest || ""] || rawDest;

  const nodeMap = useMemo(() => testData.nodes as Record<string, NodeType>, []);

  // ✅ routePath is the ONLY list of nodes we navigate through
  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

  // Start node coordinates
  const startNode = useMemo(
    () => nodeMap[originId || ""] || { x: 785, y: 924 },
    [originId, nodeMap]
  );

  // PDR (sensor gives rawPos)
  const { rawPos, heading, forceSetPos, resetHeading } = usePDR(
    startNode.x,
    startNode.y,
    isNavActive,
    routePath,
    nodeMap
  );

  const [zoom, setZoom] = useState(0.6);
  const [isFollowing, setIsFollowing] = useState(true);

  // ✅ Node-locked nav hook
  const { currentNodeIndex, currentNodeId, nextNodeId, nodeLockedPos, routeFacingAngle } =
    useNodeLockedNavigation({
      isNavActive,
      routePath,
      nodeMap,
      rawPos,
      forceSetPos,
      setIsFollowing,
      arriveThresholdPx: 35,
      forwardThresholdT: 0.92,
    });

  const nextNodeCoord = useMemo(() => {
    if (!nextNodeId) return null;
    const n = nodeMap[nextNodeId];
    return n ? { x: n.x, y: n.y } : null;
  }, [nextNodeId, nodeMap]);

  const navigationState = useMemo(() => {
    if (!nextNodeCoord) return null;
    const distPx = Math.hypot(nextNodeCoord.x - rawPos.x, nextNodeCoord.y - rawPos.y);
    return { distanceMeters: distPx / 49 };
  }, [nextNodeCoord, rawPos.x, rawPos.y]);

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

      resetHeading();
      setIsNavActive(true);
      setIsFollowing(true);
    } catch (err) {
      console.log("Permission error:", err);
    }
  };

  // Vibration feedback
  useEffect(() => {
    if (!isNavActive || !navigationState) return;

    const d = navigationState.distanceMeters;
    if (d < 3 && d > 0.5) window.navigator.vibrate?.([100, 50, 100]);
    if (d < 0.5) window.navigator.vibrate?.([200, 100, 200, 100, 200]);
  }, [isNavActive, navigationState]);

  if (!originId || !destId) return <div>Invalid Route</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>
          {isNavActive ? "Navigation Active" : "Direction Sensing"}
        </h1>

        <div style={styles.headerSubtitle}>
          <span style={{ color: isNavActive ? "#22C55E" : "#F59E0B" }}>●</span>
          {isNavActive
            ? `Route Node: ${currentNodeId || "?"} → ${nextNodeId || "END"}`
            : `Heading: ${heading.toFixed(0)}°`}
        </div>
      </header>

      <div style={styles.mapSection}>
        <MapCanvas
          routePath={routePath}
          nodeLockedPos={nodeLockedPos}
          pointerAngle={routeFacingAngle}
          isNavActive={isNavActive}
          nextNodeCoord={nextNodeCoord}
          distanceLabel={navigationState ? `${navigationState.distanceMeters.toFixed(0)}m` : ""}
          zoom={zoom}
          setZoom={setZoom}
          isFollowing={isFollowing}
          setIsFollowing={setIsFollowing}
        />

        {/* Bottom Sheet */}
        <div style={styles.bottomSheet}>
          <div style={styles.infoRow}>
            {!isNavActive ? (
              <button style={{ ...styles.btnPrimary, width: "100%" }} onClick={startNavigation}>
                🚀 START LIVE TRACKING
              </button>
            ) : (
              <div style={styles.distanceBadge}>
                {navigationState
                  ? `Next node in ${navigationState.distanceMeters.toFixed(1)}m`
                  : "📍 Navigation Ready"}
              </div>
            )}
          </div>

          <div style={styles.actionsRow}>
            <button style={styles.btnSecondary} onClick={() => navigate("/navigation")}>
              ← Back
            </button>
            <button
              style={styles.btnPrimary}
              onClick={() => {
                forceSetPos(startNode.x, startNode.y);
                setIsFollowing(true);
              }}
            >
              Reset Pos
            </button>
          </div>

          {/* Debug */}
          <div style={{ fontSize: "12px", color: colors.textSecondary, textAlign: "center" }}>
            <div>
              📍 RawPos: X:{rawPos.x.toFixed(0)} Y:{rawPos.y.toFixed(0)}
            </div>
            <div>
              🎯 NodeLocked: X:{nodeLockedPos.x.toFixed(0)} Y:{nodeLockedPos.y.toFixed(0)}
            </div>
            <div>➡ Route Facing: {routeFacingAngle.toFixed(0)}°</div>
            <div>
              🧩 Index: {currentNodeIndex}/{Math.max(routePath.length - 1, 0)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

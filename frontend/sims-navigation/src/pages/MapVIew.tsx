import { useMemo, useState, useEffect, type CSSProperties } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import testData from "../data/test_1.json";
import { findShortestPath } from "../utils/pathfinding";
import { usePDR } from "../hooks/userPDR";
import { useCRFNavigation } from "../hooks/useCRFNavigation";
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

  const routePath = useMemo(() => {
    if (!originId || !destId) return [];
    return findShortestPath(originId, destId, nodeMap);
  }, [originId, destId, nodeMap]);

  const startNode = useMemo(
    () => nodeMap[originId || ""] || { x: 785, y: 924 },
    [originId, nodeMap]
  );

  // 1. PDR System (Raw Steps + Heading)
  const { rawPos, heading, forceSetPos, resetHeading } = usePDR(
    startNode.x,
    startNode.y,
    isNavActive,
    routePath,
    nodeMap
  );

  // 2. CRF / Map-Matching (Locks PDR to Route)
  const { correctedPos, currentNode, nextNode, turnDetected, confirmTurn, segmentIndex } = useCRFNavigation({
    isNavActive,
    routePath,
    nodeMap,
    rawPos,
    heading,
    forceSetPos,
  });

  const [zoom, setZoom] = useState(0.6);
  const [isFollowing, setIsFollowing] = useState(true);

  // Calculate distance & angle to next node (based on corrected pos)
  const navInfo = useMemo(() => {
    if (!nextNode) return null;
    
    // Distance from our constrained position to next node
    const distPx = Math.hypot(nextNode.x - correctedPos.x, nextNode.y - correctedPos.y);
    const angle = (Math.atan2(nextNode.y - correctedPos.y, nextNode.x - correctedPos.x) * 180) / Math.PI;
    
    return {
        distM: (distPx / 49).toFixed(1),
        target: nextNode.type || "Node",
        angle: angle + 90
    };
  }, [correctedPos, nextNode]);

  // Auto-confirm logic
  const [autoConfirmCount, setAutoConfirmCount] = useState(5);
  useEffect(() => {
    if (turnDetected.detected) {
      setAutoConfirmCount(5);
      const timer = setInterval(() => {
        setAutoConfirmCount((prev) => {
          if (prev <= 1) {
            confirmTurn();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [turnDetected.detected, confirmTurn]);

  // Instructions Generation
  const instructions = useMemo(() => {
    if (!routePath || routePath.length < 2) return [];
    const steps = [];
    for (let i = 0; i < routePath.length - 1; i++) {
        const currId = routePath[i];
        const nextId = routePath[i+1];
        const curr = nodeMap[currId];
        const next = nodeMap[nextId];
        if (!curr || !next) continue;
        
        const dist = Math.hypot(next.x - curr.x, next.y - curr.y) / 49; 
        
        // Simple direction logic based on previous vector vs current vector could be added here
        // For now, we list the segments.
        
        steps.push({
            step: i + 1,
            text: `Go to ${nextId}`,
            dist: dist.toFixed(1),
            isNext: i === segmentIndex  // Accurate tracking
        });
    }
    return steps;
  }, [routePath, nodeMap, segmentIndex]);

  const startNavigation = async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === "function") {
        const res = await (DeviceMotionEvent as any).requestPermission();
        if (res !== "granted") return;
      }
      
      resetHeading();
      setIsNavActive(true);
      setIsFollowing(true);
    } catch (err) {
      console.log("Permission error:", err);
    }
  };

  useEffect(() => {
    // Optional: add vibration if near target
  }, []);

  if (!originId || !destId) return <div>Invalid Route</div>;

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.headerTitle}>
          {isNavActive ? "PDR Main Active" : "Ready"}
        </h1>

        <div style={styles.headerSubtitle}>
          <span style={{ color: isNavActive ? "#22C55E" : "#F59E0B" }}>●</span>
          {isNavActive
            ? "Walk to navigate"
            : "Press Start to enable sensors"}
        </div>
      </header>

      <div style={styles.mapSection}>
        <MapCanvas
          routePath={routePath}
          nodeLockedPos={correctedPos}
          isNavActive={isNavActive}
          zoom={zoom}
          setZoom={setZoom}
          isFollowing={isFollowing}
          setIsFollowing={setIsFollowing}
          rotation={heading} // ✅ Show User Heading
        />
      </div>

       {/* Turn Confirmation - Bottom Sheet Style */}
       {turnDetected.detected && (
          <div style={{
              position: "absolute",
              bottom: "180px", // Just above bottom sheet
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1E293B", 
              padding: "16px 24px",
              borderRadius: "50px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              gap: "14px",
              minWidth: "280px",
              justifyContent: "space-between",
              border: "2px solid #3B82F6",
              animation: "slideUp 0.3s ease-out"
          }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "white" }}>
                  <span style={{ fontSize: "20px" }}>📍</span>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                     <span style={{ fontSize: "14px", fontWeight: 700 }}>Arrived at Node?</span>
                     <span style={{ fontSize: "11px", color: "#94A3B8" }}>Auto-yes in {autoConfirmCount}s</span>
                  </div>
              </div>
              <button
                  style={{
                      background: "#3B82F6",
                      color: "white",
                      border: "none",
                      padding: "8px 16px",
                      borderRadius: "20px",
                      fontWeight: 700,
                      cursor: "pointer",
                      fontSize: "13px"
                  }}
                  onClick={() => confirmTurn()}
              >
                  YES
              </button>
          </div>
      )}

      <div style={styles.bottomSheet}>
        {navInfo && (
            <div style={styles.infoRow}>
                <div>Next: <b>{navInfo.target}</b></div>
                <div style={styles.distanceBadge}>{navInfo.distM} m</div>
            </div>
        )}

        {/* Step-by-Step Instructions */}
        <div style={{
            marginTop: "12px",
            maxHeight: "150px",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "8px",
            paddingRight: "4px"
        }}>
            {instructions.map((inst, idx) => (
                <div key={idx} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 12px",
                    background: inst.isNext ? "rgba(59,130,246,0.1)" : "rgba(255,255,255,0.05)",
                    borderLeft: inst.isNext ? "3px solid #3B82F6" : "3px solid transparent",
                    borderRadius: "4px",
                    color: inst.isNext ? "#fff" : "#94A3B8"
                }}>
                    <span style={{ fontSize: "13px" }}>{idx + 1}. {inst.text}</span>
                    <span style={{ fontSize: "12px", opacity: 0.7 }}>{inst.dist}m</span>
                </div>
            ))}
        </div>

        <div style={styles.actionsRow}>
          <button style={styles.btnSecondary} onClick={() => navigate("/navigation")}>
            ← Back
          </button>
          {!isNavActive && (
              <button
                style={styles.btnPrimary}
                onClick={startNavigation}
              >
                🚀 Start Walking
              </button>
          )}
           <button
              style={{...styles.btnPrimary, background: "#6366f1"}}
              onClick={() => {
                forceSetPos(startNode.x, startNode.y);
                setIsFollowing(true);
              }}
            >
              Reset
            </button>
        </div>
      </div>
    </div>
  );
}


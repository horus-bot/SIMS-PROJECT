import { useEffect, useRef, useState } from "react";
import TestMap from "../map/testMap";
import LivePointer from "./LivePointer";

type Props = {
  routePath: string[];
  nodeLockedPos: { x: number; y: number };
  isNavActive: boolean;

  nextNodeCoord?: { x: number; y: number } | null;
  distanceLabel?: string;

  zoom: number;
  setZoom: (z: number | ((prev: number) => number)) => void;

  isFollowing: boolean;
  setIsFollowing: (v: boolean) => void;
  rotation?: number;
};

export default function MapCanvas({
  routePath,
  nodeLockedPos,
  isNavActive,
  nextNodeCoord,
  distanceLabel,
  zoom,
  setZoom,
  isFollowing,
  setIsFollowing,
  rotation = 0,
}: Props) {
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // dragging
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const followTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // pinch zoom
  const [isPinching, setIsPinching] = useState(false);
  const initialDistance = useRef(0);
  const initialZoom = useRef(0);

  // Auto-follow
  useEffect(() => {
    if (!isFollowing) return;
    const vp = viewportRef.current;
    if (!vp) return;

    setCamera({
      x: vp.clientWidth / 2 - nodeLockedPos.x * zoom,
      y: vp.clientHeight / 2 - nodeLockedPos.y * zoom,
    });
  }, [nodeLockedPos.x, nodeLockedPos.y, zoom, isFollowing]);

  // Pan handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    isDragging.current = true;
    setIsFollowing(false);
    if (followTimeoutRef.current) clearTimeout(followTimeoutRef.current);

    lastMouse.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setCamera((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    followTimeoutRef.current = setTimeout(() => setIsFollowing(true), 1500);
  };

  // Zoom controls
  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.2, 4.0));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.2, 0.2));
  const handleRecenter = () => setIsFollowing(true);

  // Pinch helpers
  const getDistance = (touches: React.TouchList) => {
    const t1 = touches[0];
    const t2 = touches[1];
    return Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setIsPinching(true);
      initialDistance.current = getDistance(e.touches);
      initialZoom.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isPinching && e.touches.length === 2) {
      e.preventDefault();
      const newDistance = getDistance(e.touches);
      const rawScale = newDistance / initialDistance.current;
      const scale = Math.pow(rawScale, 0.7);
      setZoom(Math.max(0.2, Math.min(4.0, initialZoom.current * scale)));
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) setIsPinching(false);
  };

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {/* Zoom controls */}
      <div
        style={{
          position: "absolute",
          bottom: "280px",
          right: "20px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          zIndex: 50,
        }}
      >
        <button style={zoomBtnStyle} onClick={handleZoomIn}>
          +
        </button>

        <button style={zoomBtnStyle} onClick={handleZoomOut}>
          -
        </button>

        <button
          style={{ ...zoomBtnStyle, fontSize: "14px" }}
          onClick={handleRecenter}
        >
          ◉
        </button>
      </div>

      <div
        ref={viewportRef}
        style={viewportStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            transformOrigin: "0 0",
            transition: "transform 0.2s ease",
            willChange: "transform",
            transform: `translate(${camera.x}px, ${camera.y}px) scale(${zoom})`,
          }}
        >
          <TestMap routePath={routePath} />

          {/* Next waypoint */}
          {nextNodeCoord && (
            <div
              style={{
                position: "absolute",
                left: nextNodeCoord.x,
                top: nextNodeCoord.y,
                transform: "translate(-50%, -50%)",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "#10B981",
                border: "3px solid white",
                boxShadow: "0 0 15px rgba(16,185,129,0.7)",
                zIndex: 15,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "12px",
                fontWeight: "bold",
                color: "white",
              }}
            >
              <div>{distanceLabel ?? ""}</div>
            </div>
          )}

          {/* Pointer */}
          <LivePointer
            x={nodeLockedPos.x}
            y={nodeLockedPos.y}
            isNavActive={isNavActive}
            rotation={rotation}
          />
        </div>
      </div>
    </div>
  );
}

const viewportStyle: React.CSSProperties = {
  width: "100%",
  height: "100%",
  position: "relative",
  overflow: "hidden",
  borderRadius: "16px",
  cursor: "grab",
  touchAction: "none",
};

const zoomBtnStyle: React.CSSProperties = {
  width: "40px",
  height: "40px",
  borderRadius: "12px",
  backgroundColor: "#FFFFFF",
  border: "1px solid #10B981",
  color: "#1E293B",
  fontSize: "20px",
  fontWeight: "bold",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  userSelect: "none",
};

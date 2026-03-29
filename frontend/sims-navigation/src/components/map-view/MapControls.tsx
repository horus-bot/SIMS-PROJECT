import React from "react";

interface MapControlsProps {
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  autoFollow: boolean;
  isMuted?: boolean;
  setIsMuted?: (val: boolean) => void;
  // Legacy props kept for compatibility
  isDarkMode?: boolean;
  setIsDarkMode?: (val: boolean) => void;
  isNavActive?: boolean;
  currentSpeed?: number;
  navState?: any;
}

const btn: React.CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: "50%",
  backgroundColor: "transparent",
  border: "1px solid rgba(0,0,0,0.06)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "none",
  color: "#5F6368",
  transition: "transform 0.12s, color 0.12s",
  padding: 0,
};

const MapControls: React.FC<MapControlsProps> = ({
  onRecenter,
  onZoomIn,
  onZoomOut,
  autoFollow,
  isMuted,
  setIsMuted,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        top: "35%",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        zIndex: 100,
        padding: 8,
        borderRadius: 12,
        background: "rgba(255,255,255,0.78)",
        backdropFilter: "saturate(140%) blur(8px)",
        WebkitBackdropFilter: "saturate(140%) blur(8px)",
        boxShadow: "0 6px 20px rgba(16,24,40,0.08)",
        alignItems: "center",
      }}
    >
      {/* Recenter / Compass */}
      <button onClick={onRecenter} style={{ ...btn, color: autoFollow ? "#4285F4" : "#5F6368", fontSize: 20, lineHeight: 1 }} aria-label="Recenter">
        <span style={{ display: "inline-block", transform: "translateY(-1px)" }}>◎</span>
      </button>

      {/* Zoom capsule */}
      <div style={{ display: "flex", flexDirection: "column", backgroundColor: "transparent", borderRadius: 24, overflow: "hidden" }}>
        <button onClick={onZoomIn} style={{ ...btn, borderRadius: "24px 24px 0 0", boxShadow: "none", borderBottom: "1px solid rgba(0,0,0,0.06)" }} aria-label="Zoom In">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
        <button onClick={onZoomOut} style={{ ...btn, borderRadius: "0 0 24px 24px", boxShadow: "none" }} aria-label="Zoom Out">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </div>

      {/* Mute toggle */}
      {setIsMuted && (
        <button onClick={() => setIsMuted(!isMuted)} style={{ ...btn, color: isMuted ? "#EA4335" : "#5F6368" }} aria-label="Toggle Mute">
          {isMuted ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      )}
    </div>
  );
};

export default MapControls;

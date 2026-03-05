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
  backgroundColor: "#FFFFFF",
  border: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer",
  boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
  color: "#5F6368",
  transition: "background 0.15s, color 0.15s",
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
      }}
    >
      {/* Recenter / Compass */}
      <button onClick={onRecenter} style={{ ...btn, color: autoFollow ? "#4285F4" : "#5F6368" }} aria-label="Recenter">
        <svg width="22" height="22" viewBox="0 0 24 24" fill={autoFollow ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="3 11 22 2 13 21 11 13 3 11" />
        </svg>
      </button>

      {/* Zoom capsule */}
      <div style={{ display: "flex", flexDirection: "column", backgroundColor: "#fff", borderRadius: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.12)", overflow: "hidden" }}>
        <button onClick={onZoomIn} style={{ ...btn, borderRadius: "24px 24px 0 0", boxShadow: "none", borderBottom: "1px solid #E8EAED" }} aria-label="Zoom In">
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

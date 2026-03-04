import React, { useState } from "react";
import { lightColors, darkColors } from "./theme";

interface ControlButtonProps {
  label: string;
  children: React.ReactNode;
  onClick: () => void;
  style?: React.CSSProperties;
}

const ControlButton: React.FC<ControlButtonProps> = ({
  label,
  children,
  onClick,
  style,
}) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: "12px" }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span
        style={{
          ...style,
          backgroundColor: "transparent",
          boxShadow: "none",
          border: "none",
          width: "auto",
          height: "auto",
          // Helper label styles
          background: "rgba(0,0,0,0.7)",
          color: "white",
          padding: "4px 8px",
          borderRadius: "6px",
          opacity: hover ? 1 : 0,
          transform: hover ? "translateX(0px)" : "translateX(10px)",
          transition: "all 0.2s ease-out",
          visibility: hover ? "visible" : "hidden",
          marginRight: "12px",
          pointerEvents: "none",
          fontSize: "12px",
        }}
      >
        {label}
      </span>

      <button
        onClick={onClick}
        style={{
          ...style,
          transform: hover ? "scale(1.1)" : "scale(1)",
          transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {children}
      </button>
    </div>
  );
};

interface MapControlsProps {
  isDarkMode: boolean;
  setIsDarkMode: (val: boolean) => void;
  isNavActive: boolean;
  currentSpeed: number;
  navState: {
    turnType: string;
    distToTurn: number;
    totalRem: number;
  };
  onRecenter: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  isMuted: boolean;
  setIsMuted: (val: boolean) => void;
  autoFollow: boolean;
}

const MapControls: React.FC<MapControlsProps> = ({
  isDarkMode,
  setIsDarkMode,
  isNavActive,
  currentSpeed,
  navState,
  onRecenter,
  onZoomIn,
  onZoomOut,
  isMuted,
  setIsMuted,
  autoFollow,
}) => {
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <div
      style={{
        position: "absolute",
        top: "100px",
        right: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        zIndex: 200,
        alignItems: "flex-end",
      }}
    >
      {/* Dark Mode Toggle */}
      <ControlButton
        label={isDarkMode ? "Light Mode" : "Dark Mode"}
        onClick={() => setIsDarkMode(!isDarkMode)}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "16px",
          backgroundColor: isDarkMode ? "#334155" : "rgba(255, 255, 255, 0.9)",
          color: isDarkMode ? "#FCD34D" : "#475569", // Yellow moon or slate sun
          backdropFilter: "blur(8px)",
          border: `1px solid ${
            isDarkMode ? "rgba(255,255,255,0.1)" : colors.border
          }`,
          fontSize: "22px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        {isDarkMode ? "🌙" : "☀️"}
      </ControlButton>

      {/* Speed & Distance Buttons (Only when navigating) */}
      {isNavActive && (
        <>
          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              color: colors.primary,
              backdropFilter: "blur(8px)",
              border: `1px solid ${colors.secondary}`,
              fontSize: "10px",
              fontWeight: "bold",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "16px" }}>🏃</div>
            <div>{(currentSpeed * 3.6).toFixed(1)}</div>
          </div>

          <div
            style={{
              width: "50px",
              height: "50px",
              borderRadius: "16px",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              color: colors.primary,
              backdropFilter: "blur(8px)",
              border: `1px solid ${colors.secondary}`,
              fontSize: "10px",
              fontWeight: "bold",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              pointerEvents: "none",
            }}
          >
            <div style={{ fontSize: "16px" }}>📍</div>
            <div>{navState.totalRem.toFixed(0)}m</div>
          </div>
        </>
      )}

      <ControlButton
        label="Recenter"
        onClick={onRecenter}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "16px",
          backgroundColor: autoFollow
            ? colors.accent
            : "rgba(255, 255, 255, 0.9)",
          color: autoFollow ? "white" : colors.primary,
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.secondary}`,
          fontSize: "24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        ⌖
      </ControlButton>

      <ControlButton
        label="Zoom In"
        onClick={onZoomIn}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          color: colors.primary,
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.secondary}`,
          fontSize: "24px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        +
      </ControlButton>

      <ControlButton
        label="Zoom Out"
        onClick={onZoomOut}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "16px",
          backgroundColor: "rgba(255, 255, 255, 0.9)",
          color: colors.primary,
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.secondary}`,
          fontSize: "24px",
          fontWeight: "bold",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        −
      </ControlButton>

      <ControlButton
        label={isMuted ? "Unmute Voice" : "Mute Voice"}
        onClick={() => setIsMuted(!isMuted)}
        style={{
          width: "50px",
          height: "50px",
          borderRadius: "16px",
          backgroundColor: isMuted ? "#EF4444" : "rgba(255, 255, 255, 0.9)",
          color: isMuted ? "white" : colors.primary,
          backdropFilter: "blur(8px)",
          border: `1px solid ${colors.secondary}`,
          fontSize: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        }}
      >
        {isMuted ? (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor" />
            <line
              x1="16"
              y1="8"
              x2="20"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
            />
            <line
              x1="20"
              y1="8"
              x2="16"
              y2="12"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        ) : (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M3 9V15H7L12 20V4L7 9H3Z" fill="currentColor" />
            <path
              d="M16 9C16.5523 9 17 9.44772 17 10V14C17 14.5523 16.5523 15 16 15"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M19 7C20.1046 7 21 7.89543 21 9V15C21 16.1046 20.1046 17 19 17"
              stroke="currentColor"
              strokeWidth="2"
            />
          </svg>
        )}
      </ControlButton>

      {/* Turn Instruction - Below Icons */}
      {isNavActive && (
        <div
          style={{ marginTop: "10px", marginRight: "30px", width: "260px" }}
        >
          <div
            style={{
              backgroundColor: "rgba(255, 255, 255, 0.95)",
              backdropFilter: "blur(16px)",
              borderRadius: "24px",
              padding: "10px",
              paddingRight: "24px",
              boxShadow: "0 12px 40px rgba(0,0,0,0.12)",
              display: "flex",
              alignItems: "center",
              gap: "16px",
              border: "1px solid rgba(255,255,255,0.6)",
            }}
          >
            {/* Icon Container */}
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #10B981 0%, #059669 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "28px",
                boxShadow: "0 4px 12px rgba(16, 185, 129, 0.25)",
                flexShrink: 0,
              }}
            >
              {navState.turnType === "left"
                ? "↰"
                : navState.turnType === "right"
                ? "↱"
                : navState.turnType === "finish"
                ? "🏁"
                : "↑"}
            </div>

            {/* Text Info */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "2px" }}
            >
              <span
                style={{
                  fontSize: "18px",
                  fontWeight: 700,
                  color: colors.primary,
                  lineHeight: 1.2,
                }}
              >
                {navState.turnType === "left"
                  ? "Turn Left"
                  : navState.turnType === "right"
                  ? "Turn Right"
                  : navState.turnType === "finish"
                  ? "Destination"
                  : "Go Straight"}
              </span>
              <span
                style={{
                  fontSize: "14px",
                  color: colors.textSecondary,
                  fontWeight: 500,
                }}
              >
                in{" "}
                <span style={{ color: colors.primary, fontWeight: 700 }}>
                  {navState.distToTurn.toFixed(0)}
                </span>{" "}
                meters
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapControls;

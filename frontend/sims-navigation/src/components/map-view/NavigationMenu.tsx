import React from "react";

interface NavigationMenuProps {
  isNavActive: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isDarkMode?: boolean;
  destName?: string;
  totalRem?: number;
  currentSpeed?: number;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  isNavActive,
  onStartNavigation,
  onStopNavigation,
  onPrevStep,
  onNextStep,
  destName,
  totalRem,
  currentSpeed = 0,
}) => {
  const isStepControlDisabled = !isNavActive;

  // Calculate estimated time remaining based on a default walking speed of 1.4 m/s (roughly 80 meters per minute) if speed is zero
  const speedToUse = currentSpeed > 0.1 ? currentSpeed : 1.4;
  const timeRemainingMins = totalRem ? Math.max(1, Math.ceil(totalRem / (speedToUse * 60))) : 0;
  // Format speed nicely
  const displaySpeed = currentSpeed.toFixed(1);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "max(24px, env(safe-area-inset-bottom, 24px))",
        left: "50%",
        transform: "translateX(-50%)",
        width: "min(460px, calc(100% - 24px))",
        backgroundColor: "rgba(255,255,255,0.85)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        borderRadius: "clamp(20px, 5vw, 28px)",
        padding: "clamp(12px, 3.5vw, 20px)",
        display: "flex",
        flexDirection: "column",
        gap: "clamp(10px, 2.5vw, 16px)",
        zIndex: 100,
        boxShadow: "0 12px 40px rgba(0,0,0,0.15)",
      }}
    >
      {/* Top Route Info */}
      <div style={{ marginBottom: "4px" }}>
        {isNavActive && totalRem !== undefined ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", backgroundColor: "rgba(255,255,255,0.6)", borderRadius: "20px", padding: "16px", boxShadow: "inset 0 2px 4px rgba(255,255,255,0.8), 0 2px 8px rgba(0,0,0,0.04)" }}>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#1F2937", textAlign: "center" }}>
              Navigating to <span style={{ color: "#2563EB" }}>{destName || "Unknown"}</span>
            </div>
            
            {/* Metrics Dashboard */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 8px" }}>
              
              {/* Distance */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Distance</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 800, color: "#0F172A", lineHeight: 1 }}>{Math.round(totalRem)}</span>
                  <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 700, color: "#64748B" }}>m</span>
                </div>
              </div>

              <div style={{ width: "2px", height: "32px", backgroundColor: "#E2E8F0", borderRadius: "2px" }}></div>

              {/* Time */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Time</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 800, color: "#10B981", lineHeight: 1 }}>{timeRemainingMins}</span>
                  <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 700, color: "#64748B" }}>min</span>
                </div>
              </div>

              <div style={{ width: "2px", height: "32px", backgroundColor: "#E2E8F0", borderRadius: "2px" }}></div>

              {/* Speed */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                <span style={{ fontSize: "11px", color: "#64748B", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>Speed</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: "2px" }}>
                  <span style={{ fontSize: "clamp(20px, 6vw, 28px)", fontWeight: 800, color: "#8B5CF6", lineHeight: 1 }}>{displaySpeed}</span>
                  <span style={{ fontSize: "clamp(12px, 3.5vw, 14px)", fontWeight: 700, color: "#64748B" }}>m/s</span>
                </div>
              </div>

            </div>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "12px 0 8px 0" }}>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "#1F2937" }}>
              {destName ? `Destination: ${destName}` : "Select a destination"}
            </div>
            <div style={{ fontSize: "14px", color: "#64748B", marginTop: "6px" }}>
              {destName ? "Tap Start Navigation when you are ready" : "Choose a destination to continue"}
            </div>
          </div>
        )}
      </div>

      {/* Buttons Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        
        {/* Manual Control (Prev) */}
        <button
          onClick={onPrevStep}
          disabled={isStepControlDisabled}
          aria-label="Previous Step"
          style={{
            width: "40px",
            height: "40px",
            flex: "none",
            borderRadius: "50%",
            border: "none",
            cursor: isStepControlDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F3F4F6",
            color: "#4B5563",
            opacity: isStepControlDisabled ? 0.45 : 1,
            transition: "all 0.2s ease",
          }}
        >
          <svg fill="none" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>

        {/* Center Toggle: Start Live vs Stop */}
        <button
          onClick={isNavActive ? onStopNavigation : onStartNavigation}
          style={{
            flex: 1,
            height: "clamp(44px, 12vw, 48px)",
            borderRadius: "28px",
            border: "none",
            fontSize: "clamp(14px, 4vw, 16px)",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: isNavActive ? "#EF4444" : "#2563EB",
            color: "#FFFFFF",
            boxShadow: isNavActive ? "0 4px 12px rgba(239, 68, 68, 0.3)" : "0 4px 12px rgba(37, 99, 235, 0.3)",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            transform: "translateZ(0)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
            {isNavActive ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transition: "opacity 0.3s", opacity: 1 }}>
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span style={{ transition: "opacity 0.3s", opacity: 1 }}>Exit Navigation</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{ transition: "opacity 0.3s", opacity: 1 }}>
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
                <span style={{ transition: "opacity 0.3s", opacity: 1 }}>Start Navigation</span>
              </>
            )}
          </div>
        </button>

        {/* Manual Control (Next) */}
        <button
          onClick={onNextStep}
          disabled={isStepControlDisabled}
          aria-label="Next Step"
          style={{
            width: "40px",
            height: "40px",
            flex: "none",
            borderRadius: "50%",
            border: "none",
            cursor: isStepControlDisabled ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#F3F4F6",
            color: "#4B5563",
            opacity: isStepControlDisabled ? 0.45 : 1,
            transition: "all 0.2s ease",
          }}
        >
          <svg fill="none" width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default NavigationMenu;


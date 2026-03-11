import React from "react";

interface NavigationMenuProps {
  isNavActive: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isDarkMode?: boolean;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  isNavActive,
  onStartNavigation,
  onStopNavigation,
  onPrevStep,
  onNextStep,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "16px",
        left: "16px",
        right: "16px",
        backgroundColor: "#FFFFFF",
        borderRadius: "28px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        gap: "12px",
        zIndex: 100,
        boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
      }}
    >
      {/* Manual Control (Prev) */}
      <button
        onClick={onPrevStep}
        aria-label="Previous Step"
        style={{
          width: "48px",
          height: "48px",
          flex: "none",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3F4F6",
          color: "#475569",
          transition: "all 0.2s ease",
        }}
      >
        <svg fill="none" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Center Toggle: Start Live vs Stop */}
      {!isNavActive ? (
        <button
          onClick={onStartNavigation}
          style={{
            flex: 1,
            height: "48px",
            borderRadius: "24px",
            border: "none",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#2563EB", // Primary Google-ish Blue
            color: "#FFFFFF",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
          </svg>
          <span>Start Navigation</span>
        </button>
      ) : (
        <button
          onClick={onStopNavigation}
          style={{
            flex: 1,
            height: "48px",
            borderRadius: "24px",
            fontSize: "16px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#FEE2E2", // Soft red
            color: "#DC2626", // Red text
            border: "none",
            transition: "all 0.2s ease",
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Exit</span>
        </button>
      )}

      {/* Manual Control (Next) */}
      <button
        onClick={onNextStep}
        aria-label="Next Step"
        style={{
          width: "48px",
          height: "48px",
          flex: "none",
          borderRadius: "50%",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#F3F4F6",
          color: "#475569",
          transition: "all 0.2s ease",
        }}
      >
        <svg fill="none" width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default NavigationMenu;


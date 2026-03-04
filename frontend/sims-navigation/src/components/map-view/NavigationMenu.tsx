import React from "react";
import { lightColors, darkColors } from "./theme";

interface NavigationMenuProps {
  isNavActive: boolean;
  onStartNavigation: () => void;
  onStopNavigation: () => void;
  onPrevStep: () => void;
  onNextStep: () => void;
  isDarkMode: boolean;
}

const NavigationMenu: React.FC<NavigationMenuProps> = ({
  isNavActive,
  onStartNavigation,
  onStopNavigation,
  onPrevStep,
  onNextStep,
  isDarkMode,
}) => {
  const colors = isDarkMode ? darkColors : lightColors;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "20px",
        left: "20px",
        right: "20px",
        backgroundColor: colors.surface,
        borderRadius: "24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px",
        gap: "12px",
        zIndex: 100,
        boxShadow: isDarkMode
          ? "0 10px 40px rgba(0,0,0,0.5)"
          : "0 10px 40px rgba(0,0,0,0.15)",
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Manual Control (Prev) */}
      <button
        onClick={onPrevStep}
        aria-label="Previous Step"
        style={{
          width: "50px",
          height: "50px",
          flex: "none",
          borderRadius: "25px",
          border: `1px solid ${colors.border}`,
          fontSize: "24px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDarkMode ? colors.background : "#F9FAFB",
          color: colors.textSecondary,
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      {/* Center Toggle: Start Live vs Stop */}
      {!isNavActive ? (
        <button
          onClick={onStartNavigation}
          style={{
            flex: 2,
            height: "50px",
            borderRadius: "25px",
            border: "none",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: colors.accent,
            color: "#FFFFFF",
            boxShadow: `0 4px 12px ${
              isDarkMode
                ? "rgba(96, 165, 250, 0.4)"
                : "rgba(37, 99, 235, 0.3)"
            }`,
            transition: "transform 0.1s ease",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <span>Start Live Tracking</span>
        </button>
      ) : (
        <button
          onClick={onStopNavigation}
          style={{
            flex: 2,
            height: "50px",
            borderRadius: "25px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            backgroundColor: "#FFF1F2",
            color: "#E11D48",
            boxShadow: "none",
            border: "1px solid #FECDD3",
            transition: "transform 0.1s ease",
          }}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
          <span>Exit Navigation</span>
        </button>
      )}

      {/* Manual Control (Next) */}
      <button
        onClick={onNextStep}
        aria-label="Next Step"
        style={{
          width: "50px",
          height: "50px",
          flex: "none",
          borderRadius: "25px",
          border: `1px solid ${colors.border}`,
          fontSize: "24px",
          fontWeight: 600,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDarkMode ? colors.background : "#F9FAFB",
          color: colors.textSecondary,
          boxShadow: "0 2px 5px rgba(0,0,0,0.05)",
          transition: "all 0.2s ease",
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  );
};

export default NavigationMenu;

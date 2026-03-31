import { useRef, useEffect } from "react";

const AUTO_DISMISS_MS = 5000;
const AUTO_DISMISS_SECONDS = Math.floor(AUTO_DISMISS_MS / 1000);

interface TurnConfirmCardProps {
  onConfirm: () => void;
  onReject: () => void;
}

const TurnConfirmCard = ({ onConfirm, onReject }: TurnConfirmCardProps) => {
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;

  useEffect(() => {
    const timer = setTimeout(() => {
      if (onRejectRef.current) onRejectRef.current();
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        bottom: "120px",
        left: "50%",
        transform: "translateX(-50%)",
        width: "90%",
        maxWidth: "360px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
        padding: "16px",
        zIndex: 2000,
        border: "1px solid rgba(255,255,255,0.5)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            borderRadius: "16px",
            background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            color: "white",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="white"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </div>

        <div style={{ marginLeft: "16px", flex: 1 }}>
          <p
            style={{
              color: "#6B7280",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              margin: "0 0 4px 0",
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"></path>
            </svg>
            Check Point
          </p>
          <p
            style={{
              fontSize: "18px",
              fontWeight: 700,
              margin: 0,
              color: "#111827",
              lineHeight: 1.2,
            }}
          >
            At the Corner?
          </p>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "10px",
          marginTop: "16px",
          position: "relative",
          zIndex: 2,
        }}
      >
        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: "#F59E0B",
            color: "white",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
            fontSize: "16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          Yes, Align Me
        </button>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "4px",
          width: "100%",
          background: "#E5E7EB",
        }}
      >
        <div
          style={{
            height: "100%",
            background: "#F59E0B",
            animation: `countdown ${AUTO_DISMISS_SECONDS}s linear forwards`,
            width: "100%",
          }}
        />
      </div>
    </div>
  );
};

export default TurnConfirmCard;

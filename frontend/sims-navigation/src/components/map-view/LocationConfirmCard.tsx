import { useRef, useEffect } from "react";

interface LocationConfirmCardProps {
  room: string;
  image: string;
  onConfirm: () => void;
  onReject: () => void;
}

const LocationConfirmCard = ({
  room,
  image,
  onConfirm,
  onReject,
}: LocationConfirmCardProps) => {
  const onRejectRef = useRef(onReject);
  onRejectRef.current = onReject;

  // Auto-dismiss after 3s
  useEffect(() => {
    const timer = setTimeout(() => {
      if (onRejectRef.current) onRejectRef.current();
    }, 3000);
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
        maxWidth: "380px",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(12px)",
        borderRadius: "20px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        padding: "16px",
        zIndex: 2000,
        border: "1px solid rgba(255,255,255,0.5)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <img
          src={image}
          alt={room}
          style={{
            width: "70px",
            height: "70px",
            borderRadius: "16px",
            objectFit: "cover",
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          }}
        />

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
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            Check Location
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
            {room}
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
          onClick={onReject}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: "rgba(243, 244, 246, 0.8)",
            color: "#374151",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          Not Here (3s)
        </button>

        <button
          onClick={onConfirm}
          style={{
            flex: 1,
            padding: "12px",
            borderRadius: "12px",
            backgroundColor: "#10B981",
            color: "white",
            fontWeight: 600,
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Yes, I'm here
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
            background: "#10B981",
            animation: "countdown 3s linear forwards",
            width: "100%",
          }}
        />
        <style>{`
                    @keyframes countdown {
                        from { width: 100%; }
                        to { width: 0%; }
                    }
                `}</style>
      </div>
    </div>
  );
};

export default LocationConfirmCard;

import React from 'react';

export interface RouteStep {
  id: string;
  type: "straight" | "left" | "right" | "finish" | "start";
  distance: number;
  instruction: string;
}

interface RouteGuideProps {
  steps: RouteStep[];
  isOpen: boolean;
  onClose: () => void;
  destinationName?: string;
  totalDistance?: number;
}

const RouteGuide: React.FC<RouteGuideProps> = ({ steps, isOpen, onClose, destinationName, totalDistance }) => {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay for mobile */}
      <div 
        onClick={onClose}
        style={{
          position: "fixed", 
          inset: 0, 
          background: "rgba(15, 23, 42, 0.4)", 
          zIndex: 2000,
          backdropFilter: "blur(4px)",
          WebkitBackdropFilter: "blur(4px)",
        }}
        className="route-guide-backdrop"
      />

      {/* Side Panel / Bottom Sheet */}
      <div
        style={{
          position: "fixed",
          zIndex: 2001,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
          fontFamily: "'Google Sans', 'Inter', system-ui, sans-serif",
          boxShadow: "-10px 0 40px rgba(0,0,0,0.1)",
        }}
        className="route-guide-panel"
      >
        <style>{`
          .route-guide-panel {
            /* Default to mobile: bottom sheet sliding up */
            bottom: 0;
            left: 0;
            right: 0;
            top: 20%;
            border-radius: 24px 24px 0 0;
            animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes slideUp {
            from { transform: translateY(100%); }
            to { transform: translateY(0); }
          }

          /* Desktop: side panel sliding in from right */
          @media (min-width: 768px) {
            .route-guide-panel {
              top: 0;
              bottom: 0;
              right: 0;
              left: auto;
              width: 400px;
              border-radius: 0;
              animation: slideLeft 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            }

            @keyframes slideLeft {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          }

          .step-item {
            display: flex;
            align-items: flex-start;
            gap: 16px;
            padding: 16px 24px;
            position: relative;
          }

          .step-icon-container {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #f1f5f9;
            color: #334155;
            flex-shrink: 0;
            z-index: 2;
          }

          .step-item.finish .step-icon-container {
            background: #10b981;
            color: white;
          }

          .step-item.start .step-icon-container {
            background: #2563eb;
            color: white;
            width: 24px;
            height: 24px;
            margin: 8px 8px 8px 8px;
          }

          .step-line {
            position: absolute;
            left: 43px; 
            top: 52px;
            bottom: -16px;
            width: 2px;
            background: #e2e8f0;
            z-index: 1;
          }

          .step-item.start .step-line {
            left: 35px;
            top: 40px;
          }

          .step-item:last-child .step-line {
            display: none;
          }

          .step-content {
            flex: 1;
            padding-top: 10px;
          }
          
          .step-item.start .step-content {
            padding-top: 10px;
          }

          .step-instruction {
            font-size: 16px;
            font-weight: 700;
            color: #0f172a;
          }

          .step-distance {
            font-size: 14px;
            color: #64748b;
            margin-top: 4px;
            font-weight: 500;
          }
        `}</style>

        {/* Header */}
        <div style={{ padding: "24px 24px 20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1px solid #e2e8f0", flexShrink: 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#0f172a" }}>Route Steps</h2>
            <div style={{ fontSize: 14, color: "#64748b", marginTop: 6, fontWeight: 500 }}>
              To {destinationName || "Destination"} • {totalDistance ? Math.round(totalDistance) : 0}m
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: "#f1f5f9", 
              border: "none", 
              width: 36, 
              height: 36, 
              borderRadius: "50%", 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "center",
              cursor: "pointer",
              color: "#475569"
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Steps List */}
        <div style={{ flex: 1, overflowY: "auto", paddingBottom: 40, paddingTop: 8 }}>
          {steps.map((step) => {
            let icon = null;
            if (step.type === "start") {
              icon = <div style={{ width: 10, height: 10, borderRadius: "50%", background: "white" }} />;
            } else if (step.type === "finish") {
              icon = (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
              );
            } else if (step.type === "straight") {
              icon = (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="19" x2="12" y2="5" />
                  <polyline points="5 12 12 5 19 12" />
                </svg>
              );
            } else if (step.type === "left") {
              icon = (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 10 4 15 9 20" />
                  <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                </svg>
              );
            } else if (step.type === "right") {
              icon = (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 10 20 15 15 20" />
                  <path d="M4 4v7a4 4 0 0 0 4 4h12" />
                </svg>
              );
            }

            return (
              <div key={step.id} className={`step-item ${step.type}`}>
                <div className="step-icon-container">
                  {icon}
                </div>
                <div className="step-line" />
                <div className="step-content">
                  <div className="step-instruction">{step.instruction}</div>
                  {step.distance > 0 && step.type === "straight" && (
                    <div className="step-distance">Continue for {Math.round(step.distance)}m</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default RouteGuide;

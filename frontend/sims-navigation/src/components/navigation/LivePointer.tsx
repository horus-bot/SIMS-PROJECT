type Props = {
  x: number;
  y: number;
  isNavActive: boolean;
  rotation?: number;
};

export default function LivePointer({ x, y, isNavActive, rotation = 0 }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%)`,
        transition: "left 0.3s cubic-bezier(0.2, 0, 0.2, 1), top 0.3s cubic-bezier(0.2, 0, 0.2, 1)",
        zIndex: 25,
        pointerEvents: "none",
        opacity: isNavActive ? 1 : 0.7,
      }}
    >
       {/* Arrow / Beam Indicator */}
       {isNavActive && (
        <div
            style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "40px",
                height: "40px",
                transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                transition: "transform 0.15s ease-out",
                zIndex: 24,
            }}
        >
            {/* The Arrow Shape */}
            <div
                style={{
                    width: "0",
                    height: "0",
                    borderLeft: "8px solid transparent",
                    borderRight: "8px solid transparent",
                    borderBottom: "24px solid #3B82F6", // Arrow color
                    position: "absolute",
                    top: "-28px", // Push it out a bit from center
                    left: "50%",
                    transform: "translateX(-50%)",
                    filter: "drop-shadow(0 0 4px rgba(59,130,246,0.6))"
                }}
            />
        </div>
       )}

      {/* Center Dot */}
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#3B82F6",
          border: "3px solid white",
          boxShadow: "0 0 15px rgba(59,130,246,0.5)",
          position: 'relative',
          zIndex: 26
        }}
      />
    </div>
  );
}

type Props = {
  x: number;
  y: number;
  angleDeg: number;
  isNavActive: boolean;
};

export default function LivePointer({ x, y, angleDeg, isNavActive }: Props) {
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
        transition: "transform 0.12s linear, left 0.12s linear, top 0.12s linear",
        zIndex: 25,
        pointerEvents: "none",
        opacity: isNavActive ? 1 : 0.7,
      }}
    >
      {/* Beam */}
      <div
        style={{
          position: "absolute",
          bottom: "50%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "120px",
          height: "160px",
          background:
            "linear-gradient(to top, rgba(59,130,246,0.45) 0%, rgba(59,130,246,0) 100%)",
          clipPath: "polygon(50% 100%, 0% 0%, 100% 0%)",
          zIndex: 24,
        }}
      />

      {/* Dot */}
      <div
        style={{
          width: "18px",
          height: "18px",
          borderRadius: "50%",
          background: "#3B82F6",
          border: "3px solid white",
          boxShadow: "0 0 15px rgba(59,130,246,0.5)",
          transform: "translate(-50%, -50%)",
          position: "absolute",
          left: "50%",
          top: "50%",
          zIndex: 26,
        }}
      >
        {/* Arrow */}
        <div
          style={{
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderBottom: "8px solid white",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -80%)",
          }}
        />
      </div>
    </div>
  );
}

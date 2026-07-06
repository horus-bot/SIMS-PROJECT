import React, { useMemo, useState, useEffect } from "react";
import testDataDefault from "../../data/test_1.json";

interface TestMapProps {
  routePath?: string[];
  actualPath?: { x: number; y: number }[];
  isDeviated?: boolean;
  floorData?: any;
  nodeMap?: Record<string, { x: number; y: number; type: string }>;
}

const TestMap: React.FC<TestMapProps> = ({
  routePath = [],
  actualPath = [],
  isDeviated = false,
  floorData,
  nodeMap
}) => {
  const currentData = floorData || testDataDefault;
  const activeNodes = nodeMap || (currentData.nodes as Record<string, { x: number; y: number }>);

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });

  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };
    img.src = currentData.meta.svg;
  }, [currentData.meta.svg]);

  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch(currentData.meta.svg)
      .then((r) => r.text())
      .then((text) => {
        if (cancelled) return;
        setSvgMarkup(text);
      })
      .catch(() => {
        setSvgMarkup(null);
      });
    return () => { cancelled = true; };
  }, [currentData.meta.svg]);

  const polylinePoints = useMemo(() => {
    if (!routePath || routePath.length < 2) return "";
    return routePath
      .map((nodeId) => {
        const node = activeNodes[nodeId];
        return node ? `${node.x},${node.y}` : null;
      })
      .filter((p) => p !== null)
      .join(" ");
  }, [routePath, activeNodes]);

  const routePathString = useMemo(() => {
    if (!routePath || routePath.length < 2) return "";
    const pts = routePath
      .map((nodeId) => {
        const node = activeNodes[nodeId];
        return node ? `${node.x},${node.y}` : null;
      })
      .filter((p) => p !== null);
    if (pts.length < 2) return "";
    return `M ${pts[0]} L ${pts.slice(1).join(" L ")}`;
  }, [routePath, activeNodes]);

  const actualPolylinePoints = useMemo(() => {
    if (!actualPath || actualPath.length < 2) return "";
    return actualPath.map((p) => `${p.x},${p.y}`).join(" ");
  }, [actualPath]);

  const colors = {
    pathMain: "#3B82F6",
    pathStroke: "white",
    highlight: "rgba(255,255,255,0.6)",
    actualPath: isDeviated ? "#EF4444" : "#10B981"
  };

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width ? `${dimensions.width}px` : "auto",
        height: dimensions.height ? `${dimensions.height}px` : "auto",
        background: "transparent",
        overflow: "hidden"
      }}
    >
      {svgMarkup ? (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            filter: "drop-shadow(0px 12px 32px rgba(0,0,0,0.12)) drop-shadow(0px 4px 8px rgba(0,0,0,0.06))",
            transition: "all 0.3s ease"
          }}
          dangerouslySetInnerHTML={{ __html: svgMarkup }}
        />
      ) : (
        <img
          src={currentData.meta.svg}
          alt="Indoor Map"
          width={dimensions.width || undefined}
          height={dimensions.height || undefined}
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none"
          }}
        />
      )}

      <svg
        width={dimensions.width || "100%"}
        height={dimensions.height || "100%"}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 10
        }}
      >
        <defs>
          <filter id="pathShadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow
              dx="0"
              dy="2"
              stdDeviation="2"
              floodColor="#3B82F6"
              floodOpacity="0.12"
            />
          </filter>
          <linearGradient id="pinGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>
        </defs>

        {polylinePoints && (
          <g filter="url(#pathShadow)">
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.pathMain}
              strokeWidth="8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.highlight}
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              transform="translate(-3,-3)"
              opacity="0.8"
            />
          </g>
        )}

        {/* Animated ball along the path to show direction */}
        {routePathString && (
          <circle r="8" fill="#F59E0B" style={{ filter: "drop-shadow(0px 2px 4px rgba(0,0,0,0.4))" }}>
            <animateMotion path={routePathString} dur="3.5s" repeatCount="indefinite" />
          </circle>
        )}

        {actualPolylinePoints && (
          <polyline
            points={actualPolylinePoints}
            fill="none"
            stroke={colors.actualPath}
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isDeviated ? "12,12" : "0"}
            opacity="0.85"
          />
        )}

        {routePath.length > 0 && dimensions.width > 0 && (
          <>
            <g
              transform={`translate(${
                activeNodes[routePath[0]]?.x || 0
              }, ${activeNodes[routePath[0]]?.y || 0})`}
            >
              <circle r="24" fill="#22C55E" opacity="0.4">
                <animate
                  attributeName="r"
                  values="24;32;24"
                  dur="2s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="opacity"
                  values="0.4;0;0.4"
                  dur="2s"
                  repeatCount="indefinite"
                />
              </circle>
              <circle r="14" fill="#22C55E" stroke="white" strokeWidth="3" />
            </g>

            <g
              transform={`translate(${
                activeNodes[routePath[routePath.length - 1]]?.x || 0
              }, ${
                activeNodes[routePath[routePath.length - 1]]?.y || 0
              })`}
            >
              <path
                d="M0 0 C -2 -2 -10 -12 -10 -22 C -10 -32 -6 -38 0 -38 C 6 -38 10 -32 10 -22 C 10 -12 2 -2 0 0"
                fill="url(#pinGradient)"
                stroke="white"
                strokeWidth="2"
                transform="translate(0,-2)"
              />
              <circle cx="0" cy="-24" r="4" fill="white" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

export default TestMap;

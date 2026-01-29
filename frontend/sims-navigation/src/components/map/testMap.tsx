import React, { useMemo } from "react";
import testData from "../../data/test_1.json"; // Direct import for node coordinates

interface TestMapProps {
  routePath?: string[]; // Array of node IDs representing the path
  actualPath?: {x: number, y: number}[]; // Actual path taken
  isDeviated?: boolean; // Whether deviated from route
}

const TestMap: React.FC<TestMapProps> = ({ routePath = [], actualPath = [], isDeviated = false }) => {
  // Convert node IDs in routePath to coordinate points string for polyline
  const polylinePoints = useMemo(() => {
    if (!routePath || routePath.length < 2) return "";
    
    // cast testData to access nodes safely
    const nodes = testData.nodes as Record<string, { x: number; y: number }>;
    
    return routePath
      .map(nodeId => {
        const node = nodes[nodeId];
        return node ? `${node.x},${node.y}` : null;
      })
      .filter(p => p !== null)
      .join(" ");
  }, [routePath]);

  // Convert actual path to polyline points
  const actualPolylinePoints = useMemo(() => {
    if (!actualPath || actualPath.length < 2) return "";
    return actualPath.map(p => `${p.x},${p.y}`).join(" ");
  }, [actualPath]);

  return (
    <div style={{ position: "relative", width: "4101px", height: "3025px" }}>
      {/* 1. Base Map Image */}
      <img
        src="/DemoMap.svg" // Changed from /assets/test_1.svg to /DemoMap.svg
        alt="Indoor Map"
        width={4101}
        height={3025}
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      />

      {/* 2. SVG Overlay for Path */}
      <svg
        width={4101}
        height={3025}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}
      >
        {/* Draw the connected path */}
        {polylinePoints && (
          <polyline
            points={polylinePoints}
            fill="none"
            stroke="#3B82F6" // Blue path color
            strokeWidth="12"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25))" }}
          />
        )}

        {/* Draw actual path in red if deviated */}
        {isDeviated && actualPolylinePoints && (
          <polyline
            points={actualPolylinePoints}
            fill="none"
            stroke="#EF4444" // Red for deviated path
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ filter: "drop-shadow(0px 4px 4px rgba(0,0,0,0.25))" }}
          />
        )}

        {/* Draw circles for start and end */}
        {routePath.length > 0 && (
          <>
            {/* Start Node */}
            <circle
              cx={(testData.nodes as any)[routePath[0]]?.x}
              cy={(testData.nodes as any)[routePath[0]]?.y}
              r="20"
              fill="#22C55E"
            />
            {/* End Node */}
            <circle
              cx={(testData.nodes as any)[routePath[routePath.length - 1]]?.x}
              cy={(testData.nodes as any)[routePath[routePath.length - 1]]?.y}
              r="20"
              fill="#EF4444"
            />
          </>
        )}
      </svg>
    </div>
  );
};

export default TestMap;

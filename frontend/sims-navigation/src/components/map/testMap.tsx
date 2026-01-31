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
    <div style={{ 
        position: "relative", 
        width: "4101px", 
        height: "3025px",
        // Enhanced 3D Plate Effect (Light Mode)
        boxShadow: `
            0 30px 60px -12px rgba(50, 50, 93, 0.25), 
            0 18px 36px -18px rgba(0, 0, 0, 0.15),
            0 0 0 1px rgba(0,0,0,0.02)
        `, 
        background: "#ffffff", // Clean white board
        borderRadius: '8px'
    }}>
      {/* 1. Base Map Image - Bright and Clean */}
      <img
        src="/2nd_Floor.svg"
        alt="Indoor Map"
        width={4101}
        height={3025}
        style={{ 
            position: "absolute", 
            inset: 0, 
            pointerEvents: "none",
            opacity: 0.9,
            mixBlendMode: 'multiply', // Blends nicely with white bg
        }}
      />

      {/* 2. SVG Overlay for Path */}
      <svg
        width={4101}
        height={3025}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}
      >
        <defs>
            {/* Soft Shadow for path */}
            <filter id="pathShell" x="-20%" y="-20%" width="140%" height="140%">
               <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor="#3B82F6" floodOpacity="0.25" />
            </filter>
        </defs>

        {/* Draw the connected path with "Glassy Tube" effect */}
        {polylinePoints && (
          <g filter="url(#pathShell)">
             {/* 1. Casing / Shadow */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke="white"
                strokeWidth="28" 
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="1.0"
             />
             
             {/* 2. Main Color Body */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke="#3B82F6"
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
             />

             {/* 3. Gloss/Highlight (Right side) */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke="#93C5FD" 
                strokeWidth="6"
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(-3, -3)" // Offset to create specular look
                opacity="0.8"
            />
          </g>
        )}

        {/* Draw actual path (Green normally, Red/Dashed if deviated) */}
        {actualPolylinePoints && (
          <polyline
            points={actualPolylinePoints}
            fill="none"
            stroke={isDeviated ? "#EF4444" : "#10B981"} 
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={isDeviated ? "12, 12" : "0"}
          />
        )}

        {/* Draw Markers for start and end */}
        {routePath.length > 0 && (
          <>
            {/* Start Node: Pulsing Green Dot */}
            <g transform={`translate(${(testData.nodes as any)[routePath[0]]?.x}, ${(testData.nodes as any)[routePath[0]]?.y})`}>
                <circle r="24" fill="#22C55E" opacity="0.4">
                    <animate attributeName="r" values="24;32;24" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle r="14" fill="#22C55E" stroke="white" strokeWidth="3" style={{ filter: "url(#shadow)" }} />
            </g>

            {/* End Node: Destination Pin */}
            <g transform={`translate(${(testData.nodes as any)[routePath[routePath.length - 1]]?.x}, ${(testData.nodes as any)[routePath[routePath.length - 1]]?.y})`} style={{ filter: "url(#shadow)" }}>
                 {/* Destination Label */}
                 {(() => {
                    const endNodeId = routePath[routePath.length - 1];
                    const destLabel = Object.entries((testData as any).destination || {}).find(([_, val]) => val === endNodeId)?.[0];
                    if (!destLabel) return null;
                    
                    return (
                        <g transform="translate(0, -50)">
                            {/* Background Pill for readability */}
                            <rect 
                                x="-60" y="-18" 
                                width="120" height="26" 
                                rx="12" 
                                fill="white" 
                                opacity="0.9"
                                stroke="#EF4444"
                                strokeWidth="2"
                            />
                            {/* Text Label */}
                            <text 
                                textAnchor="middle" 
                                dominantBaseline="middle"
                                fill="#DC2626" 
                                fontSize="16" 
                                fontWeight="bold" 
                                style={{ fontFamily: 'sans-serif' }}
                            >
                                {destLabel}
                            </text>
                        </g>
                    );
                })()}

                {/* Pin Shape */}
                <path 
                    d="M0 0 C -2 -2 -10 -12 -10 -22 C -10 -32 -6 -38 0 -38 C 6 -38 10 -32 10 -22 C 10 -12 2 -2 0 0" 
                    fill="url(#pinGradient)" 
                    stroke="white" 
                    strokeWidth="2"
                    transform="translate(0, -2)" // Nudge up so tip is at node
                />
                {/* Center dot in pin */}
                <circle cx="0" cy="-24" r="4" fill="white" />
            </g>
          </>
        )}
      </svg>
    </div>
  );
};

export default TestMap;

import React, { useMemo, useState, useEffect } from "react";
import testData from "../../data/test_1.json"; // Direct import for node coordinates

interface TestMapProps {
  routePath?: string[]; // Array of node IDs representing the path
  actualPath?: {x: number, y: number}[]; // Actual path taken
  isDeviated?: boolean; // Whether deviated from route
  isDarkMode?: boolean; // Dark mode toggle
}

const TestMap: React.FC<TestMapProps> = ({ routePath = [], actualPath = [], isDeviated = false, isDarkMode = false }) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Load image to get natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = testData.meta.svg;
  }, []);

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

  // Dynamic Colors based on Dark Mode
  const colors = {
    bg: isDarkMode ? "#0F172A" : "#ffffff",
    pathMain: isDarkMode ? "#22D3EE" : "#3B82F6", // Cyan vs Blue
    pathGlow: isDarkMode ? "#0891B2" : "#3B82F6",
    pathStroke: isDarkMode ? "rgba(0,0,0,0.5)" : "white",
    highlight: isDarkMode ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.6)",
    actualPath: isDeviated ? "#EF4444" : (isDarkMode ? "#F472B6" : "#10B981"), // Pink in dark mode for contrast
    shadow: isDarkMode ? "rgba(34, 211, 238, 0.4)" : "rgba(59, 130, 246, 0.25)"
  };

  return (
    <div style={{ 
        position: "relative", 
        width: dimensions.width ? `${dimensions.width}px` : "auto", 
        height: dimensions.height ? `${dimensions.height}px` : "auto",
        // Enhanced 3D Plate Effect
        boxShadow: isDarkMode 
            ? "0 30px 60px -12px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.05)"
            : "0 30px 60px -12px rgba(50, 50, 93, 0.25), 0 18px 36px -18px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0,0,0,0.02)", 
        background: colors.bg, 
        borderRadius: '8px',
        overflow: 'hidden',
        transition: 'background 0.3s ease'
    }}>
      {/* 1. Base Map Image */}
      <img
        src={testData.meta.svg}
        alt="Indoor Map"
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
        style={{ 
            position: "absolute", 
            inset: 0, 
            pointerEvents: "none",
            opacity: isDarkMode ? 0.6 : 0.9,
            // "Blueprint" effect for Dark Mode
            filter: isDarkMode ? "invert(1) grayscale(1) brightness(0.7) contrast(1.5) hue-rotate(180deg)" : "none",
            mixBlendMode: isDarkMode ? 'lighten' : 'multiply', 
            transition: 'all 0.3s ease'
        }}
      />

      {/* 2. SVG Overlay for Path */}
      <svg
        width={dimensions.width || "100%"}
        height={dimensions.height || "100%"}
        style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}
      >
        <defs>
            {/* Soft Shadow for path */}
            <filter id="pathShell" x="-20%" y="-20%" width="140%" height="140%">
               <feDropShadow dx="0" dy="8" stdDeviation={isDarkMode ? "12" : "6"} floodColor={colors.pathGlow} floodOpacity={isDarkMode ? "0.6" : "0.25"} />
            </filter>
            
            {/* Pin Gradient */}
            <linearGradient id="pinGradient" x1="0" y1="0" x2="0" y2="1">
               <stop offset="0%" stopColor="#EF4444" />
               <stop offset="100%" stopColor="#B91C1C" />
            </linearGradient>
            
            <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
               <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="black" floodOpacity="0.3" />
            </filter>
        </defs>

        {/* Draw the connected path with "Glassy Tube" effect */}
        {polylinePoints && (
          <g filter="url(#pathShell)">
             {/* 1. Casing / Shadow */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke={colors.pathStroke}
                strokeWidth={isDarkMode ? "32" : "28"} 
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="1.0"
             />
             
             {/* 2. Main Color Body */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke={colors.pathMain}
                strokeWidth="18"
                strokeLinecap="round"
                strokeLinejoin="round"
             />

             {/* 3. Gloss/Highlight (Right side) */}
             <polyline
                points={polylinePoints}
                fill="none"
                stroke={colors.highlight}
                strokeWidth={isDarkMode ? "4" : "6"}
                strokeLinecap="round"
                strokeLinejoin="round"
                transform="translate(-3, -3)" // Offset to create specular look
                opacity="0.8"
            />
          </g>
        )}

        {/* Actual Path (Breadcrumbs) - If tracking is active */}
        {actualPolylinePoints && (
             <polyline
                points={actualPolylinePoints}
                fill="none"
                stroke={colors.actualPath}
                strokeWidth="8"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray={isDeviated ? "12, 12" : "0"}
                opacity="0.8"
             />
        )}

        {/* Draw Markers for start and end */}
        {routePath.length > 0 && dimensions.width > 0 && (
          <>
            {/* Start Node: Pulsing Dot */}
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
                    const destLabel = Object.entries((testData as any).destinations || {}).find(([_, val]) => (val as any).node === endNodeId)?.[0];
                    if (!destLabel) return null;

                    return (
                        <g transform="translate(0, -50)">
                            {/* Background Pill for readability */}
                            <rect
                                x="-60" y="-18"
                                width="120" height="26"
                                rx="12"
                                fill={isDarkMode ? "#1E293B" : "white"}
                                opacity="0.95"
                                stroke="#EF4444"
                                strokeWidth="2"
                            />
                            {/* Text Label */}
                            <text
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill={isDarkMode ? "white" : "#DC2626"}
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

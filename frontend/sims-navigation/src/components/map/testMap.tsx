import React, { useMemo, useState, useEffect } from "react";
import testData from "../../data/test_1.json";

/*
|--------------------------------------------------------------------------
| TestMapProps
|--------------------------------------------------------------------------
| Defines the data this component can receive from the parent.
| This component is purely a renderer, so it only receives
| navigation data and displays it visually on the map.
|
| routePath   → array of node IDs representing the planned navigation route
| actualPath  → coordinates of the user's real movement (for tracking)
| isDeviated  → if true, actual path is shown as a dashed warning line
|--------------------------------------------------------------------------
*/

interface TestMapProps {
  routePath?: string[];
  actualPath?: { x: number; y: number }[];
  isDeviated?: boolean;
}

/*
|--------------------------------------------------------------------------
| TestMap Component
|--------------------------------------------------------------------------
| Responsible for:
| 1. Loading the base SVG floor map
| 2. Creating a pixel-based canvas using SVG overlay
| 3. Rendering the navigation route
| 4. Rendering the actual user path
| 5. Displaying start and destination markers
|--------------------------------------------------------------------------
*/

const TestMap: React.FC<TestMapProps> = ({
  routePath = [],
  actualPath = [],
  isDeviated = false
}) => {

  /*
  |--------------------------------------------------------------------------
  | Map Dimensions State
  |--------------------------------------------------------------------------
  | Stores the natural width and height of the SVG map.
  | This ensures our overlay SVG uses the exact same coordinate space
  | as the original map image.
  |--------------------------------------------------------------------------
  */

  const [dimensions, setDimensions] = useState({
    width: 0,
    height: 0
  });

  /*
  |--------------------------------------------------------------------------
  | Load Map Image
  |--------------------------------------------------------------------------
  | We load the SVG once to read its natural pixel dimensions.
  | This allows the overlay SVG to perfectly align with the map.
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    const img = new Image();

    img.onload = () => {
      setDimensions({
        width: img.naturalWidth,
        height: img.naturalHeight
      });
    };

    img.src = testData.meta.svg;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Convert route node IDs → SVG polyline points
  |--------------------------------------------------------------------------
  | Example:
  |
  | routePath = ["node_001","node_002","node_003"]
  |
  | becomes:
  |
  | "x1,y1 x2,y2 x3,y3"
  |
  | which is the format SVG uses for drawing connected paths.
  |--------------------------------------------------------------------------
  */

  const polylinePoints = useMemo(() => {
    if (!routePath || routePath.length < 2) return "";

    const nodes = testData.nodes as Record<string, { x: number; y: number }>;

    return routePath
      .map((nodeId) => {
        const node = nodes[nodeId];
        return node ? `${node.x},${node.y}` : null;
      })
      .filter((p) => p !== null)
      .join(" ");
  }, [routePath]);

  /*
  |--------------------------------------------------------------------------
  | Convert actual user path → SVG polyline points
  |--------------------------------------------------------------------------
  | This draws the real movement trail of the user.
  | Used for deviation detection and breadcrumb navigation.
  |--------------------------------------------------------------------------
  */

  const actualPolylinePoints = useMemo(() => {
    if (!actualPath || actualPath.length < 2) return "";

    return actualPath.map((p) => `${p.x},${p.y}`).join(" ");
  }, [actualPath]);

  /*
  |--------------------------------------------------------------------------
  | Color Configuration
  |--------------------------------------------------------------------------
  | Defines the visual styling of the map elements.
  |--------------------------------------------------------------------------
  */

  const colors = {
    pathMain: "#3B82F6",        // main navigation route
    pathStroke: "white",        // outer stroke casing
    highlight: "rgba(255,255,255,0.6)", // glossy highlight
    actualPath: isDeviated ? "#EF4444" : "#10B981" // deviation warning
  };

  return (
    <div
      style={{
        position: "relative",
        width: dimensions.width ? `${dimensions.width}px` : "auto",
        height: dimensions.height ? `${dimensions.height}px` : "auto",
        background: "#ffffff",
        borderRadius: "8px",
        overflow: "hidden"
      }}
    >

      {/* ------------------------------------------------------------------ */}
      {/* Base Map Image                                                     */}
      {/* ------------------------------------------------------------------ */}
      {/* This renders the building floor plan.                              */}
      {/* The SVG overlay will be placed directly on top of this image.      */}
      {/* ------------------------------------------------------------------ */}

      <img
        src={testData.meta.svg}
        alt="Indoor Map"
        width={dimensions.width || undefined}
        height={dimensions.height || undefined}
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none"
        }}
      />

      {/* ------------------------------------------------------------------ */}
      {/* SVG Overlay Canvas                                                 */}
      {/* ------------------------------------------------------------------ */}
      {/* This is where all navigation visuals are drawn.                    */}
      {/* Coordinates in the JSON map directly to pixels here.               */}
      {/* ------------------------------------------------------------------ */}

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

        {/* ================================================================ */}
        {/* SVG Definitions (Filters & Gradients)                           */}
        {/* ================================================================ */}

        <defs>

          {/* Shadow effect used for path glow */}
          <filter id="pathShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="6"
              stdDeviation="6"
              floodColor="#3B82F6"
              floodOpacity="0.25"
            />
          </filter>

          {/* Destination pin gradient */}
          <linearGradient id="pinGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#B91C1C" />
          </linearGradient>

        </defs>

        {/* ================================================================ */}
        {/* Planned Navigation Route                                         */}
        {/* ================================================================ */}

        {polylinePoints && (
          <g filter="url(#pathShadow)">

            {/* Outer casing */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.pathStroke}
              strokeWidth="28"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Main route line */}
            <polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.pathMain}
              strokeWidth="18"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Gloss highlight */}
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

        {/* ================================================================ */}
        {/* Actual User Path (Breadcrumb Trail)                              */}
        {/* ================================================================ */}

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

        {/* ================================================================ */}
        {/* Start and Destination Markers                                    */}
        {/* ================================================================ */}

        {routePath.length > 0 && dimensions.width > 0 && (
          <>
            {/* ---------------- Start Marker ---------------- */}

            <g
              transform={`translate(${
                (testData.nodes as any)[routePath[0]]?.x
              }, ${(testData.nodes as any)[routePath[0]]?.y})`}
            >

              {/* Pulsing circle animation */}
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

              {/* Solid center */}
              <circle r="14" fill="#22C55E" stroke="white" strokeWidth="3" />
            </g>

            {/* ---------------- Destination Pin ---------------- */}

            <g
              transform={`translate(${
                (testData.nodes as any)[
                  routePath[routePath.length - 1]
                ]?.x
              }, ${
                (testData.nodes as any)[
                  routePath[routePath.length - 1]
                ]?.y
              })`}
            >

              {/* Pin body */}
              <path
                d="M0 0 C -2 -2 -10 -12 -10 -22 C -10 -32 -6 -38 0 -38 C 6 -38 10 -32 10 -22 C 10 -12 2 -2 0 0"
                fill="url(#pinGradient)"
                stroke="white"
                strokeWidth="2"
                transform="translate(0,-2)"
              />

              {/* Pin center dot */}
              <circle cx="0" cy="-24" r="4" fill="white" />
            </g>
          </>
        )}

      </svg>
    </div>
  );
};

export default TestMap;
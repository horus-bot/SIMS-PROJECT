# GEMINI.md

## Project Overview
**SIMS Navigation Frontend** is a high-performance indoor navigation web application designed for SIMS Hospital. It provides real-time, interactive guidance through hospital premises using SVG-based maps and advanced indoor positioning algorithms.

### Main Technologies
- **Framework:** React 19 (TypeScript)
- **Build Tool:** Vite
- **Animations/Camera:** GSAP (GreenSock Animation Platform)
- **Indoor Positioning:** Pedestrian Dead Reckoning (PDR) & Kalman Filtering
- **Navigation:** Dijkstra-based Shortest Path Algorithm
- **Icons:** Lucide React
- **PWA:** Vite PWA Plugin for offline support and installability

## Building and Running
1.  **Install Dependencies:** `npm install`
2.  **Start Development Server:** `npm run dev`
3.  **Build for Production:** `npm run build` (runs `tsc` and then `vite build`)
4.  **Linting:** `npm run lint`

## Architecture & Core Modules

### 1. Navigation & Pathfinding (`src/utils/pathfinding.ts`)
- Implements Dijkstra's algorithm to find the shortest path between nodes.
- Uses a graph defined by `nodes` and `edges` in JSON data files.
- Computes weights based on Euclidean distance between node coordinates.

### 2. Positioning & Sensors (`src/hooks/usePDR.ts`)
- Uses `DeviceMotionEvent` and `DeviceOrientationEvent` for Pedestrian Dead Reckoning.
- Calculates steps, heading, and displacement to update the user's position on the map without GPS.
- Employs Kalman filtering (`src/utils/kalman2d.ts`) for noise reduction.

### 3. Map Rendering & Camera (`src/pages/MapVIew.tsx`)
- Renders custom SVG maps (`src/components/map/testMap.tsx`).
- Uses GSAP for smooth camera transitions, including auto-follow, clamping to map bounds, and bounding-box zooming for routes.
- Supports touch gestures (pinch-to-zoom, pan) with sophisticated coordinate clamping to keep the user pointer in view.

### 4. Data Layer (`src/data/`)
- `test_1.json`, `floor_1.json`, etc., contain the "Source of Truth" for the navigation graph.
- `destinations` mapping links human-readable names to specific node IDs and associated photos (`pic`).

### 5. Localization & UI
- **QR Scanner:** Used for initial localization or checkpoint validation.
- **Location Confirmation:** Prompts users with photos of landmarks to verify their position.
- **Voice Guidance:** Integrated `SpeechSynthesis` for turn-by-turn audio instructions.

## Development Conventions
- **Functional Components:** All UI is built using React functional components and hooks.
- **Type Safety:** Strict TypeScript usage for all data structures (Nodes, Edges, Paths).
- **Surgical Updates:** When modifying map logic, ensure GSAP camera states (`camState`) are maintained to prevent jarring jumps.
- **Data Driven:** Avoid hardcoding node coordinates; always update the JSON files in `src/data/` and ensure types match.

## Key Files
- `src/pages/MapVIew.tsx`: The primary navigation and map interaction controller.
- `src/hooks/usePDR.ts`: The sensor-fusion engine for indoor movement.
- `src/utils/pathfinding.ts`: Core Dijkstra implementation.
- `src/data/test_1.json`: The current active navigation graph data.

# SIMS — Indoor Navigation Frontend

A modern, production-ready single-page application that provides indoor navigation for hospital environments. The frontend is built with React + TypeScript and offers interactive mapping, multi-mode localization, and turn-by-turn navigation designed for accuracy, accessibility, and PWA-enabled offline usage.

## Key Features

- **Interactive Map Viewer:** Vector/SVG map rendering with zoom, pan and layered controls.
- **Graph-based Pathfinding:** Fast shortest-path routing using map graph data (see `src/utils/pathfinding.ts`).
- **Sensor Fusion & Localization:** PDR-based dead-reckoning, Kalman filtering, and map-matching utilities to improve position estimates (`src/utils/kalman2d.ts`, `src/utils/mapMatching.ts`).
- **QR-assisted Positioning:** Scan facility QR codes to confirm or correct user position (`src/components/QRScanner.tsx`).
- **Turn-by-turn Guidance:** Navigation flow with turn confirmation and location confirmation UIs (`src/map-view/TurnConfirmCard.tsx`, `src/map-view/LocationConfirmCard.tsx`).
- **Multiple Navigation Modes:** CRF navigation and node-locked navigation hooks (`src/hooks/useCRFNavigation.ts`, `src/hooks/useNodeLockedNaviagtion.tsx`).
- **PWA Ready:** Offline-capable with a web manifest and service-worker support via `vite-plugin-pwa` for installable experience.
- **Admin / QR Tools:** QR admin and testing pages for facility maintenance and debugging (`src/pages/qrAdmin.tsx`, `src/pages/test.tsx`).

## Tech Stack

- React 19 + TypeScript
- Vite build system
- React Router for routing
- GSAP for onboarding/visual animations
- Lucide React for icons
- `qr-scanner` and `qrcode` for QR flows
- `vite-plugin-pwa` for PWA support

(See `package.json` for exact versions and scripts.)

## Data & Algorithms

- Map and graph data: `src/data/floor_1.json`, `src/data/graphData4th.json` — stores nodes, edges, and map metadata.
- Pathfinding: `src/utils/pathfinding.ts` implements routing over the graph dataset.
- Kalman filter and PDR: `src/utils/kalman2d.ts` and `src/hooks/usePDR.ts` for sensor-driven position smoothing.
- Map matching: `src/utils/mapMatching.ts` aligns noisy location traces to the map graph.

## Project Structure (high level)

- `public/` — static assets (maps, icons, manifest)
- `src/` — application source
    - `components/` — UI components (Header, Avatar, HealthStatus, Mic, PWA prompt, QRScanner)
    - `map-view/` — map-specific UI and controls (MapHeader, MapControls, NavigationMenu)
    - `pages/` — top-level pages (landing, map view, navigation, qr admin)
    - `data/` — JSON map & graph data
    - `hooks/` — navigation & sensor hooks (CRF, node-locked, PDR)
    - `utils/` — algorithms (kalman, map matching, pathfinding)

## Getting Started (development)

1. From the project root, open the frontend folder:

```bash
cd frontend/sims-navigation
```

2. Install dependencies:

```bash
npm install
```

3. Start the dev server:

```bash
npm run dev
```

The app runs by default at `http://localhost:5173`.

## Useful Scripts

- `npm run dev` — development server
- `npm run build` — build for production (runs TypeScript build then Vite)
- `npm run preview` — preview the production build
- `npm run lint` — run ESLint checks

## Where to Look First (for contributors)

- Core navigation logic: `src/utils/pathfinding.ts`, `src/utils/mapMatching.ts`, `src/utils/kalman2d.ts`.
- Navigation UI and flows: `src/map-view/*`, `src/pages/navigation.tsx`.
- Localization hooks: `src/hooks/usePDR.ts`, `src/hooks/useCRFNavigation.ts`.
- Map data: `src/data/floor_1.json`, `src/data/graphData4th.json`.

## Notes & Next Steps

- The frontend is intentionally decoupled from any specific backend — API clients live under `src/lib/api` and can be wired to your preferred server for health checks and intent handling (`src/lib/api/health.ts`, `src/lib/api/intent.ts`).
- To reproduce or extend navigation tests, use the sample datasets in `src/data/` and the test page `src/pages/test.tsx`.

If you want, I can now:

- open a PR with this README change,
- add badges and screenshots to the README,
- or generate a short CONTRIBUTING.md to help onboard new contributors.


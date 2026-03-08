# SIMS Navigation Frontend

This is the frontend application for the SIMS Hospital Indoor Navigation System. It provides an interactive interface for users to navigate through the hospital premises using digital maps and pathfinding.

## Tech Stack

- **Framework:** [React](https://react.dev/) (v19)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Routing:** [React Router](https://reactrouter.com/)
- **Animations:** [GSAP](https://gsap.com/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Location & QR:** `qr-scanner`, `qrcode`
- **PWA:** `vite-plugin-pwa`

## Prerequisites

- Node.js (version 20 or higher recommended)
- npm

## Getting Started

1.  **Navigate to the frontend directory:**

    ```bash
    cd frontend/sims-navigation
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    ```

3.  **Run the development server:**

    ```bash
    npm run dev
    ```

    The application should now be running at `http://localhost:5173`.

## Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the application for production.
- `npm run preview`: Previews the production build locally.
- `npm run lint`: Runs ESLint to check for code quality issues.

## Project Structure

- `public/`: Static assets like SVG maps and images.
- `src/`: Source code.
  - `components/`: Reusable UI components.
  - `pages/`: Application pages.
  - `data/`: JSON data files for map nodes and edges.
  - `utils/`: Utility functions.

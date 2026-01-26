import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']],
      },
    }),
  ],
  server: {
    // 1. Force Vite to listen on all local IPs
    host: true, 
    // 2. Disable the strict host check for tunnels like Ngrok
    allowedHosts: ['postdepressive-deena-separative.ngrok-free.dev', 'all'],
    // 3. Optional: Ensure HMR works over the tunnel
    hmr: {
      clientPort: 443,
    },
  }
})
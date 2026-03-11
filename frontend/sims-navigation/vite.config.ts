import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [["babel-plugin-react-compiler"]],
      },
    }),

    VitePWA({
      workbox: {
        navigateFallback: null,
      },
    }),
  ],

  server: {
    host: true,
    allowedHosts: [
      // Your specific new host
      "postdepressive-deena-separative.ngrok-free.dev",
      
      // Keep your old ones if you want, but these two lines 
      // will act as wildcards for ALL future ngrok URLs:
      ".ngrok-free.dev",
      ".ngrok-free.app"
    ],
  },
});
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
  // Add this server block below
  server: {
    host: true,
    allowedHosts: ["53ced87a0164.ngrok-free.app"],
  },
});
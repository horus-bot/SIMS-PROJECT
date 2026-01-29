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
    allowedHosts: ["53ced87a0164.ngrok-free.app","e6bfc0ca2641.ngrok-free.app","b3d17e8c585e.ngrok-free.app"],
  },
});
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
    allowedHosts: ["53ced87a0164.ngrok-free.app","e6bfc0ca2641.ngrok-free.app","b3d17e8c585e.ngrok-free.app","9b9a9dd9c3e6.ngrok-free.app","1db14def3517.ngrok-free.app","2b57-2409-40f4-a-8bb0-7459-b5ec-2b23-4133.ngrok-free.app","8bc2-2409-40f4-3a-8bcf-f504-5cd0-cc0f-2d03.ngrok-free.app","fb54-2409-40f4-aa-aeb7-75f3-fac8-f2bd-190d.ngrok-free.app","176e-49-37-215-66.ngrok-free.app"],
  },
});
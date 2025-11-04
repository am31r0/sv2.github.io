import { defineConfig } from "vite";

export default defineConfig({
  root: "./",
  build: { outDir: "dist" },
  server: {
    host: true, // bereik over LAN (voor testen op telefoon)
    port: 5173,
    strictPort: true,
  },
});

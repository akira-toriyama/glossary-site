import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Pages base path is supplied at build time by the reusable workflow,
// e.g. VITE_BASE=/wand/ → assets resolve under akira-toriyama.github.io/wand/.
// Defaults to "/" so `vite dev` (root) works.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || "/",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});

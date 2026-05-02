import { defineConfig } from "vite";
import motionCanvas from "@motion-canvas/vite-plugin";
import ffmpeg from "@motion-canvas/ffmpeg";
import vue from "@vitejs/plugin-vue";
import { moliniani } from "@moliniani/vite-plugin";
import path from "node:path";

/**
 * Vite configuration for the playground.
 *
 * Uses @moliniani/vite-plugin to automatically wrap .vue SFCs as Motion Canvas
 * nodes, enabling direct use in scenes without manual defineVueNode() calls.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@moliniani/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [vue({}), moliniani(), motionCanvas(), ffmpeg()],
});

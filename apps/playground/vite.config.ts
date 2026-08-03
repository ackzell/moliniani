import { defineConfig, type Plugin } from "vite";
import motionCanvas from "@motion-canvas/vite-plugin";
import ffmpeg from "@motion-canvas/ffmpeg";
import vue from "@vitejs/plugin-vue";
import { moliniani } from "@moliniani/vite-plugin";
import path from "node:path";

// Equivalent to TresJS template compiler options.
// Keeps playground startup independent from direct @tresjs/core resolution in
// vite.config while still treating Tres components as custom elements.
const tresTemplateCompilerOptions = {
  template: {
    compilerOptions: {
      isCustomElement: (tag: string) =>
        ((/^Tres[A-Z]/.test(tag) || tag.startsWith("tres-")) && tag !== "Teleport") ||
        tag === "primitive",
    },
  },
};

/**
 * Vite configuration for the playground.
 *
 * Uses @moliniani/vite-plugin to automatically wrap .vue SFCs as Motion Canvas
 * nodes, enabling direct use in scenes without manual defineVueNode() calls.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@moliniani/components/vue": path.resolve(
        __dirname,
        "../../packages/components/src/vue/index.ts",
      ),
      "@moliniani/components": path.resolve(__dirname, "../../packages/components/src/index.ts"),
      "@moliniani/utils": path.resolve(__dirname, "../../packages/utils/src/index.ts"),
      "@moliniani/core": path.resolve(__dirname, "../../packages/core/src/index.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    vue({ ...tresTemplateCompilerOptions }),
    moliniani() as unknown as Plugin,
    motionCanvas(),
    ffmpeg(),
    {
      name: "moliniani:rolldown-target-fix",
      config() {
        return { build: { target: "esnext" } };
      },
    },
  ],
});

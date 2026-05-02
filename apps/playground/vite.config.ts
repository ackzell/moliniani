import { defineConfig } from "vite";
import motionCanvas from "@motion-canvas/vite-plugin";
import ffmpeg from "@motion-canvas/ffmpeg";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue({}), motionCanvas(), ffmpeg()],
});

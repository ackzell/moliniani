import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite-plus";

// Resolves a `#include "..."` directive from a GLSL file to its on-disk
// contents, handling relative paths and bare npm specifiers (e.g.
// `@motion-canvas/core/shaders/common.glsl`). MC's own webglPlugin does this
// inside a Motion Canvas project; this build-time loader does it for the
// bundled library so shipped `.glsl` strings are self-contained.
const INCLUDE_REGEX = /^#include\s+"([^"]+)"/;
const require = createRequire(import.meta.url);

function inlineIncludes(file: string, source: string, seen: Set<string>): string {
  seen.add(file);
  return source
    .split(/\r?\n/)
    .map((line) => {
      const match = line.match(INCLUDE_REGEX);
      if (!match) return line;
      const spec = match[1];
      const child = spec.startsWith(".") ? resolve(dirname(file), spec) : require.resolve(spec);
      if (seen.has(child)) {
        throw new Error(`moliniani: circular GLSL include of ${child} from ${file}`);
      }
      return inlineIncludes(child, readFileSync(child, "utf8"), seen);
    })
    .join("\n");
}

function loadGlslModule(id: string): string | null {
  const clean = id.split("?")[0];
  if (!clean.endsWith(".glsl")) return null;
  const source = inlineIncludes(clean, readFileSync(clean, "utf8"), new Set());
  // Escape so the source survives embedding in a template literal.
  const escaped = source.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${");
  return `export default \`${escaped}\`;`;
}

const glslPlugin = {
  name: "moliniani:glsl",
  load(id: string): string | null {
    return loadGlslModule(id);
  },
};

export default defineConfig({
  // Vite plugins for the vitest (`vp test`) and dev pipeline: `.glsl` files
  // become inline string modules with `#include`s resolved.
  plugins: [glslPlugin],
  pack: {
    dts: {
      tsgo: true,
    },
    exports: true,
    entry: ["src/index.ts", "src/vue/index.ts", "src/backgrounds/index.ts"],
    // Rolldown `load` plugin for the library bundler (`vp build`).
    plugins: [glslPlugin],
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
  test: {
    environment: "jsdom",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
  },
});

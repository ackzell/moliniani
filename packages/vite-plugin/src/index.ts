import { writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Moliniani Vite plugin.
 *
 * Automatically wraps the default export of every `*.vue` file with
 * `defineVueNode()` from `@moliniani/core`, making Vue SFCs usable directly
 * in Motion Canvas JSX without any extra boilerplate:
 *
 * ```tsx
 * // Before plugin (manual):
 * import _MyBox from '../components/MyBox.vue'
 * import { defineVueNode } from '@moliniani/core'
 * const MyBox = defineVueNode(_MyBox)
 *
 * // After plugin (automatic):
 * import MyBox from '../components/MyBox.vue'  // already a VueNode class
 * ```
 *
 * Add it to your `vite.config.ts` **after** `@vitejs/plugin-vue`:
 *
 * ```ts
 * import vue from '@vitejs/plugin-vue'
 * import { moliniani } from '@moliniani/vite-plugin'
 *
 * export default defineConfig({
 *   plugins: [vue(), moliniani(), motionCanvas()],
 * })
 * ```
 */
export function moliniani() {
  return {
    name: "vite-plugin-moliniani",
    // Run after @vitejs/plugin-vue so the SFC has already been compiled to JS.
    enforce: "post",

    transform(code: string, id: string) {
      // Process SFC entry modules with or without query strings.
      // Skip vue subpart requests such as ?vue&type=style or ?vue&type=template.
      if (!id.includes(".vue")) return null;
      if (/[?&]type=/.test(id)) return null;
      if (!/\bexport\s+default\b/.test(code)) return null;
      if (code.includes("__mn_defineVueNode")) return null;

      console.log("[moliniani-vite] Transforming:", id);

      // Emit a .d.ts file that declares this .vue component as a VueNodeConstructor.
      // This helps TypeScript and Volar understand the wrapped component type.
      const dtsPath = id + ".d.ts";
      const dtsDir = path.dirname(dtsPath);
      if (!existsSync(dtsDir)) {
        mkdirSync(dtsDir, { recursive: true });
      }
      const dtsContent = `import type { VueNodeConstructor } from "@moliniani/core";
declare const _default: VueNodeConstructor<any>;
export default _default;
`;
      writeFileSync(dtsPath, dtsContent);

      // Extract filename for Tres detection (e.g., "TresBox" from "TresBox.vue")
      const fileName = path.basename(id).replace(/\.vue$/, "");
      console.log("[moliniani-vite] File name:", fileName);

      // Rewrite the final default export, regardless of expression shape.
      const marker = "export default";
      const index = code.lastIndexOf(marker);
      if (index < 0) return null;

      const before = code.slice(0, index);
      const after = code.slice(index + marker.length);
      const replaced =
        `${before}const __mn_sfc_default =${after}\n` +
        `export default __mn_defineVueNode(__mn_sfc_default, ${JSON.stringify(fileName)});`;

      const finalCode = `import { defineVueNode as __mn_defineVueNode } from '@moliniani/core';\n${replaced}`;
      console.log("[moliniani-vite] Generated code snippet:", finalCode.slice(0, 200));

      return {
        code: finalCode,
        map: null,
      };
    },
  };
}

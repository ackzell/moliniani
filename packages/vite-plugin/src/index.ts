import { writeFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { parse } from "@vue/compiler-sfc";
import type { Plugin } from "vite";

/**
 * Characters that mark a props type literal as too complex to safely inline
 * into a generated `.d.ts`: generics (`<>`), functions (`()`), tuples/arrays
 * (`[]`), nested objects (`{}`), intersections (`&`), defaults (`=`),
 * template-literal types (`` ` ``).
 */
const COMPLEX_TYPE_CHARS = /[<>()[\]{}\x26\x3D\x60]/;

const DEFINE_PROPS_TYPE_RE = /\bdefineProps\s*<([\s\S]*?)>/;

/**
 * True when `text` is a self-contained `{ ... }` object-literal type that can be
 * pasted verbatim into a generated declaration file — only optional/required
 * props of primitive or string-literal-union types.
 */
function isInlineablePropsType(text: string): boolean {
  if (!/^\{[\s\S]*\}$/.test(text)) return false;
  const inner = text.slice(1, -1);
  if (!inner.trim()) return true;
  if (COMPLEX_TYPE_CHARS.test(inner)) return false;
  if (inner.includes("...")) return false;
  if (/\b(extends|infer|keyof|typeof|import)\b/.test(inner)) return false;
  return true;
}

/**
 * Extracts a `defineProps<{ ... }>` type literal from a Vue SFC so the plugin
 * can emit a typed `VueNodeConstructor<P>` next to every `.vue` import.
 *
 * Returns `undefined` when the props type references external types or uses
 * features that can't be safely inlined (the emitted declaration falls back to
 * `VueNodeConstructor<any>`).
 */
export function extractPropsType(source: string): string | undefined {
  let setup: string | undefined;
  try {
    const { descriptor, errors } = parse(source, { filename: "component.vue" });
    if (errors.length > 0) return undefined;
    setup = descriptor.scriptSetup?.content;
  } catch {
    return undefined;
  }
  if (!setup) return undefined;
  const match = setup.match(DEFINE_PROPS_TYPE_RE);
  if (!match) return undefined;
  const type = match[1].trim();
  return isInlineablePropsType(type) ? type : undefined;
}

/**
 * Moliniani Vite plugin.
 *
 * Automatically wraps the default export of every `*.vue` file with
 * `defineVueNode()` / `defineTresNode()` from `@moliniani/core`, making Vue SFCs
 * usable directly in Motion Canvas JSX without any extra boilerplate:
 *
 * ```tsx
 * import MyBox from '../components/MyBox.vue'
 *
 * view.add(<MyBox label="Hello" width={500} x={-400} />)
 * ```
 *
 * For every `.vue` file it also emits a typed declaration next to the SFC
 * (`MyBox.vue.d.ts`) carrying the component's `defineProps` types, so JSX props
 * and `createMnRef()` animatable methods get full IntelliSense.
 *
 * TresJS 3D components (filenames containing `Tres`, e.g. `TresBox.vue`) are
 * wrapped with `defineTresNode()` so they can also be used directly as JSX tags
 * and mount as WebGL nodes.
 *
 * `.vue` modules that are imported by another `.vue` file are treated as nested
 * components and left untouched, so SFC-in-SFC composition keeps working.
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
export function moliniani(): Plugin {
  // A .vue module imported by another .vue file is a nested component and must
  // stay a plain Vue component so SFC-in-SFC composition keeps working. The
  // importer graph is not exposed here (`ModuleInfo.importers` is unsupported by
  // the current Vite), so we build the reverse index ourselves: Vite transforms
  // an importer before its dependencies, so by the time a nested child is
  // transformed its parent has already recorded it below.
  const nestedVueIds = new Set<string>();

  return {
    name: "vite-plugin-moliniani",
    // Run after @vitejs/plugin-vue so the SFC has already been compiled to JS.
    enforce: "post",

    async transform(code: string, id: string) {
      // Process only plain SFC entry modules. Skip vue subpart requests such as
      // ?vue&type=style or ?vue&type=template, and query imports like ?raw.
      if (!id.includes(".vue") || id.includes("?")) return null;
      if (/[?&]type=/.test(id)) return null;

      // Record any .vue files this SFC imports as nested components.
      const vueImportSpecifierRe = /(?:from\s+|import\s+)["']([^"']+\.vue)["']/g;
      for (const match of code.matchAll(vueImportSpecifierRe)) {
        const resolved = await this.resolve(match[1], id);
        if (resolved) nestedVueIds.add(resolved.id);
      }

      // Extract filename for Tres detection (e.g., "TresBox" from "TresBox.vue")
      const fileName = path.basename(id).replace(/\.vue$/, "");

      const isNested = nestedVueIds.has(id);

      let propsType: string | undefined;
      try {
        propsType = extractPropsType(readFileSync(id, "utf-8"));
      } catch {
        propsType = undefined;
      }

      // Emit a .d.ts next to the SFC. For scene-facing components it declares a
      // typed VueNodeConstructor (so MC JSX props typecheck); for nested ones a
      // plain Vue component so Volar/templates see the real component type.
      const dtsPath = id + ".d.ts";
      const dtsDir = path.dirname(dtsPath);
      const propsText = propsType ?? "any";
      const dtsContent = isNested
        ? `import type { DefineComponent } from "vue";\n` +
          `declare const _default: DefineComponent<${propsText}>;\n` +
          `export default _default;\n`
        : `import type { VueNodeConstructor } from "@moliniani/core";\n` +
          `declare const _default: VueNodeConstructor<${propsText}>;\n` +
          `export default _default;\n`;

      if (!existsSync(dtsDir)) {
        mkdirSync(dtsDir, { recursive: true });
      }
      if (!existsSync(dtsPath) || readFileSync(dtsPath, "utf-8") !== dtsContent) {
        writeFileSync(dtsPath, dtsContent);
      }

      if (isNested) return null;
      if (!/\bexport\s+default\b/.test(code)) return null;
      if (code.includes("__mn_defineVueNode") || code.includes("__mn_defineTresNode")) return null;

      // TresJS components are wrapped with defineTresNode so they mount as WebGL
      // nodes; everything else uses the 2D DOM-overlay path.
      const wrapName = /Tres/.test(fileName) ? "defineTresNode" : "defineVueNode";

      // Rewrite the final default export, regardless of expression shape.
      const marker = "export default";
      const index = code.lastIndexOf(marker);
      if (index < 0) return null;

      const before = code.slice(0, index);
      const after = code.slice(index + marker.length);
      const replaced =
        `${before}const __mn_sfc_default =${after}\n` +
        `export default __mn_${wrapName}(__mn_sfc_default, ${JSON.stringify(fileName)});`;

      return {
        code: `import { ${wrapName} as __mn_${wrapName} } from '@moliniani/core';\n${replaced}`,
        map: null,
      };
    },
  };
}

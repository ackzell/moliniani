// Precompiles the Vue SFCs in `src/vue/` into self-contained `.gen.ts` modules.
//
// The package is built with tsdown (`vp pack`), which does not understand `.vue`
// files, so each SFC is compiled ahead of time with `@vue/compiler-sfc`:
// script setup, render function, and (scoped) styles are inlined into a plain
// TypeScript module. `vue/index.ts` imports the generated modules and wraps them
// with `defineVueNode()`.
//
// Run `pnpm gen` after editing any SFC under `src/vue/`. Generated files carry a
// header comment and must not be hand-edited.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, basename } from "node:path";
import { parse, compileScript, compileTemplate, compileStyle } from "@vue/compiler-sfc";

const vueDir = resolve(import.meta.dirname, "../src/vue");

function compileSfc(file) {
  const filename = basename(file);
  const componentName = filename.replace(/\.vue$/, "");
  const scopeId = `data-v-${componentName}`;

  const source = readFileSync(file, "utf-8");
  const { descriptor, errors } = parse(source, { filename });
  if (errors.length > 0) throw errors[0];

  const script = compileScript(descriptor, { id: scopeId, inlineTemplate: false });

  let templateCode = "";
  if (descriptor.template) {
    const template = compileTemplate({
      id: scopeId,
      filename,
      source: descriptor.template.content,
      scoped: descriptor.styles.some((s) => s.scoped),
      slotted: descriptor.slotted,
      compilerOptions: {
        scopeId: descriptor.styles.some((s) => s.scoped) ? scopeId : undefined,
        bindingMetadata: script.bindings,
      },
    });
    if (template.errors.length > 0) throw template.errors[0];
    templateCode = template.code;
  }

  const styles = descriptor.styles.map((style) => {
    const result = compileStyle({
      source: style.content,
      filename,
      id: scopeId,
      scoped: style.scoped,
    });
    if (result.errors.length > 0) throw result.errors[0];
    return result.code;
  });

  const scriptCode = script.content.replace(/\bexport default\b/, "const _sfc_main =");
  const renderCode = templateCode.replace(/\bexport function render\b/, "function _sfc_render");

  const injectedCss = styles.map((css) => {
    const json = JSON.stringify(css);
    return [
      `const __style = ${json};`,
      `if (typeof document !== "undefined" && !document.getElementById(${JSON.stringify(scopeId)})) {`,
      `  const __styleEl = document.createElement("style");`,
      `  __styleEl.id = ${JSON.stringify(scopeId)};`,
      `  __styleEl.textContent = __style;`,
      `  document.head.appendChild(__styleEl);`,
      `}`,
    ].join("\n");
  });

  const out = [
    `// @ts-nocheck — generated file, do not hand-edit. Run \`pnpm gen\` after editing the SFC.`,
    `/* eslint-disable */`,
    scriptCode,
    renderCode,
    `_sfc_main.render = _sfc_render;`,
    `_sfc_main.__scopeId = ${JSON.stringify(scopeId)};`,
    ...injectedCss,
    `export default _sfc_main;`,
  ].join("\n");

  const output = file.replace(/\.vue$/, ".gen.ts");
  writeFileSync(output, out);
  console.log(`compiled ${filename} -> ${basename(output)}`);
}

const files = readdirSync(vueDir).filter((f) => f.endsWith(".vue"));
if (files.length === 0) {
  console.log("no .vue files found in src/vue");
  process.exit(1);
}
for (const file of files) compileSfc(resolve(vueDir, file));

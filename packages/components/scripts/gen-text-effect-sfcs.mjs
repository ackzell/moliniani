// One-off scaffolder for the animate-text text-effect SFCs.
//
// The formulaic text effects are thin wrappers around the shared
// `useSplitUnits` composable driven by a declarative `phase` signal; only their
// spec const, class name, and (for per-line targets) the inner-unit display
// differ. This script emits those SFCs once — the outputs are committed as
// *normal, hand-editable* files (unlike the `*.gen.ts` outputs of
// `compile-vue.mjs`). Re-run it when a new effect is added to the
// `textEffects.ts` registry, then run `pnpm gen` to compile the SFCs.
//
// Hand-written effects (shimmer-sweep, typewriter) are intentionally not
// generated. The kinetic builds are generated as enter-frame approximations of
// their skill specs (see the README's "kinetic builds" note); the measured
// push/reflow renderer is future work.

import { readdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const vueDir = resolve(dirname(fileURLToPath(import.meta.url)), "../src/vue");

const KNOB_TYPES = {
  total: "number",
  duration: "number",
  stagger: "number",
  ease: "string",
  rise: "number",
  x: "number",
  blur: "number",
  scaleFrom: "number",
  opacityFrom: "number",
  exitDuration: "number",
  exitStagger: "number",
  exitTotal: "number",
  exitEase: "string",
  exitRise: "number",
  exitX: "number",
  exitBlur: "number",
  exitScale: "number",
  exitOpacity: "number",
  exitStaggerMode: "string",
};

const propsInterface = Object.entries(KNOB_TYPES)
  .map(([knob, type]) => `  ${knob}?: ${type};`)
  .join("\n");

const sfcPropsInterface = propsInterface
  .split("\n")
  .map((line) => (line ? `  ${line}` : line))
  .join("\n");

// id -> { spec: registry const name, component: PascalCase name, target,
//          wrapLines }
const EFFECTS = [
  ["per-character-rise", "PER_CHARACTER_RISE", "PerCharacterRise", "chars"],
  ["per-word-crossfade", "PER_WORD_CROSSFADE", "PerWordCrossfade", "words"],
  ["spring-scale-in", "SPRING_SCALE_IN", "SpringScaleIn", "words"],
  ["mask-reveal-up", "MASK_REVEAL_UP", "MaskRevealUp", "lines", true],
  ["line-by-line-slide", "LINE_BY_LINE_SLIDE", "LineByLineSlide", "lines"],
  ["micro-scale-fade", "MICRO_SCALE_FADE", "MicroScaleFade", "whole"],
  ["fade-through", "FADE_THROUGH", "FadeThrough", "whole"],
  ["shared-axis-y", "SHARED_AXIS_Y", "SharedAxisY", "words"],
  ["shared-axis-z", "SHARED_AXIS_Z", "SharedAxisZ", "whole"],
  ["blur-out-up", "BLUR_OUT_UP", "BlurOutUp", "words"],
  ["scale-down-fade", "SCALE_DOWN_FADE", "ScaleDownFade", "whole"],
  ["focus-blur-resolve", "FOCUS_BLUR_RESOLVE", "FocusBlurResolve", "whole"],
  ["bottom-up-letters", "BOTTOM_UP_LETTERS", "BottomUpLetters", "chars"],
  ["top-down-letters", "TOP_DOWN_LETTERS", "TopDownLetters", "chars"],
  ["depth-parallax-words", "DEPTH_PARALLAX_WORDS", "DepthParallaxWords", "words"],
  ["shared-axis-x", "SHARED_AXIS_X", "SharedAxisX", "whole"],
  ["stagger-from-center", "STAGGER_FROM_CENTER", "StaggerFromCenter", "chars"],
  ["stagger-from-edges", "STAGGER_FROM_EDGES", "StaggerFromEdges", "chars"],
  // Kinetic builds — enter-frame approximations (fine-tune pending).
  ["kinetic-center-build", "KINETIC_CENTER_BUILD", "KineticCenterBuild", "words"],
  ["short-slide-down", "SHORT_SLIDE_DOWN", "ShortSlideDown", "words"],
  ["short-slide-right", "SHORT_SLIDE_RIGHT", "ShortSlideRight", "whole"],
];

function sfcFor(id, specConst, component, target, wrapLines = false) {
  const klass = id; // kebab-case id doubles as the root class name.
  const innerDisplay = target === "lines" ? "block" : "inline-block";
  const wrapParams = wrapLines ? `, wrap: true` : "";
  return `<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { ${specConst}, resolveEffectKnobs } from "../textEffects";
import { fromState } from "../effectTiming";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    phase?: number;
    exit?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
${sfcPropsInterface}
  }>(),
  {
    ...${specConst}.defaults,
    split: ${specConst}.target,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const split = useSplitUnits(
  el,
  () =>
    ({
      [props.split]: { class: \`${klass}-\${props.split}\`${wrapParams} },
    }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    // The split is already at its from-state before the first frame's
    // updater runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(resolveEffectKnobs(${specConst}, props)),
    // Declarative phase driver: the scene tweens the \`phase\` / \`exit\` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(${specConst}, props),
      staggerMode: () => ${specConst}.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// (duration/stagger/ease/…) flow through the phase driver live instead.
watch(
  () => props.split,
  () => split.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="${klass}"
    :style="{
      color: props.color,
      fontFamily: props.fontFamily,
      fontSize: \`\${props.fontSize}px\`,
    }"
  />
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text (background-clip: text and overflow: clip line wrappers cut the
   letters). \`normal\` makes the line box follow the font's own metrics. */
.${klass} {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}

.${klass} :deep(span) {
  display: ${innerDisplay};
  will-change: transform, opacity, filter;
}
</style>
`;
}

function wrappersFor(effects) {
  const imports = effects
    .map(([, , component]) => `import ${component}Sfc from "./${component}.gen";`)
    .join("\n");
  const blocks = effects
    .map(([, , component, target]) => {
      // Cascade effects (target !== "whole") get the shared phase-interception
      // extend so the phase tween duration drives the derived stagger and the
      // scene ease is dropped (per-unit signature ease only).
      const extend = target !== "whole" ? `\n  textEffectExtend(true),` : "";
      // Long component names push the typed-const cast past printWidth (100),
      // which prettier breaks across lines — match its canonical form.
      const typedConst = `const ${component}SfcTyped = ${component}Sfc as unknown as DefineComponent<any, any, any>;`;
      const typed =
        typedConst.length > 100
          ? `const ${component}SfcTyped = ${component}Sfc as unknown as DefineComponent<\n  any,\n  any,\n  any\n>;`
          : typedConst;
      return [
        `export interface ${component}Props {`,
        `  text?: string;`,
        `  split?: string;`,
        `  phase?: number;`,
        `  exit?: number;`,
        `  fontSize?: number;`,
        `  fontFamily?: string;`,
        `  color?: string;`,
        propsInterface,
        `}`,
        ``,
        typed,
        ``,
        `export const ${component}: VueNodeConstructor<${component}Props> = defineVueNode(`,
        `  ${component}SfcTyped,`,
        `  "${component}",${extend}`,
        `);`,
      ].join("\n");
    })
    .join("\n\n");
  return `// Generated once by scripts/gen-text-effect-sfcs.mjs — edit the SFCs directly.
// Wraps the compiled text-effect SFCs with defineVueNode() so they work as MC
// nodes. The Typewriter and ShimmerSweep effects are hand-authored below this
// file in src/vue/index.ts.
import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import { textEffectExtend } from "../textEffectNode";
import type { DefineComponent } from "vue";
${imports}

${blocks}
`;
}

for (const [id, specConst, component, target, wrapLines] of EFFECTS) {
  const file = resolve(vueDir, `${component}.vue`);
  writeFileSync(file, sfcFor(id, specConst, component, target, wrapLines));
  console.log(`wrote ${component}.vue`);
}

writeFileSync(resolve(vueDir, "TextEffectWrappers.ts"), wrappersFor(EFFECTS));
console.log(`wrote TextEffectWrappers.ts (${EFFECTS.length} effects)`);

const existing = readdirSync(vueDir)
  .filter((f) => f.endsWith(".vue"))
  .map((f) => f.replace(/\.vue$/, ""))
  .sort();
console.log("vue/ directory now contains:", existing.join(", "));

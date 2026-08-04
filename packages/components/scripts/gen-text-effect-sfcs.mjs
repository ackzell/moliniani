// One-off scaffolder for the animate-text text-effect SFCs.
//
// The formulaic text effects are thin wrappers around the shared
// `useSplitTextAnimation` composable; only their spec const, class name, and
// (for per-line targets) the inner-unit display differ. This script emits those
// SFCs once — the outputs are committed as *normal, hand-editable* files (unlike
// the `*.gen.ts` outputs of `compile-vue.mjs`). Re-run it when a new effect is
// added to the `textEffects.ts` registry, then run `pnpm gen` to compile the
// SFCs.
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
  duration: "number",
  stagger: "number",
  ease: "string",
  rise: "number",
  x: "number",
  blur: "number",
  scaleFrom: "number",
  opacityFrom: "number",
};

const propsInterface = Object.entries(KNOB_TYPES)
  .map(([knob, type]) => `  ${knob}?: ${type};`)
  .join("\n");

const sfcPropsInterface = propsInterface
  .split("\n")
  .map((line) => (line ? `  ${line}` : line))
  .join("\n");

// id -> { spec: registry const name, component: PascalCase name, target }
const EFFECTS = [
  ["per-character-rise", "PER_CHARACTER_RISE", "PerCharacterRise", "chars"],
  ["per-word-crossfade", "PER_WORD_CROSSFADE", "PerWordCrossfade", "words"],
  ["spring-scale-in", "SPRING_SCALE_IN", "SpringScaleIn", "words"],
  ["mask-reveal-up", "MASK_REVEAL_UP", "MaskRevealUp", "lines"],
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

function sfcFor(id, specConst, component, target) {
  const klass = id; // kebab-case id doubles as the root class name.
  const innerDisplay = target === "lines" ? "block" : "inline-block";
  return `<script setup lang="ts">
// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, ${specConst}, type TextEffectProps } from "../textEffects";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    progress?: number;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
${sfcPropsInterface}
  }>(),
  {
    ...${specConst}.defaults,
    split: ${specConst}.target,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: \`${klass}-\${props.split}\` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(${specConst}, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => ${specConst}.staggerMode,
  },
);

watch(
  () => [props.split, props.duration, props.stagger, props.ease, props.rise, props.x, props.blur, props.scaleFrom, props.opacityFrom],
  () => anime.rebuild(),
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
.${klass} {
  display: inline-block;
  white-space: pre;
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
    .map(([, , component]) => {
      return [
        `export interface ${component}Props {`,
        `  text?: string;`,
        `  split?: string;`,
        `  progress?: number;`,
        `  fontSize?: number;`,
        `  fontFamily?: string;`,
        `  color?: string;`,
        propsInterface,
        `}`,
        ``,
        `const ${component}SfcTyped = ${component}Sfc as unknown as DefineComponent<any, any, any>;`,
        ``,
        `export const ${component}: VueNodeConstructor<${component}Props> = defineVueNode(`,
        `  ${component}SfcTyped,`,
        `  "${component}",`,
        `);`,
      ].join("\n");
    })
    .join("\n\n");
  return `// Generated once by scripts/gen-text-effect-sfcs.mjs — edit the SFCs directly.
// Wraps the compiled text-effect SFCs with defineVueNode() so they work as MC
// nodes. The Typewriter and ShimmerSweep effects are hand-authored below this
// file in src/vue/index.ts.
import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import type { DefineComponent } from "vue";
${imports}

${blocks}
`;
}

for (const [id, specConst, component, target] of EFFECTS) {
  const file = resolve(vueDir, `${component}.vue`);
  writeFileSync(file, sfcFor(id, specConst, component, target));
  console.log(`wrote ${component}.vue`);
}

writeFileSync(resolve(vueDir, "TextEffectWrappers.ts"), wrappersFor(EFFECTS));
console.log(`wrote TextEffectWrappers.ts (${EFFECTS.length} effects)`);

const existing = readdirSync(vueDir)
  .filter((f) => f.endsWith(".vue"))
  .map((f) => f.replace(/\.vue$/, ""))
  .sort();
console.log("vue/ directory now contains:", existing.join(", "));

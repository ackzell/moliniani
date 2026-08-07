// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { computed, ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { resolveEffectKnobs, type TextEffectSpec } from "../textEffects";
import { fromState } from "../effectTiming";

// The full knob set is inline (rather than reusing `TextEffectProps`) because
// `@vue/compiler-sfc` can't resolve an `extends` on an external interface into
// runtime props. The wrapper (`AnimatedText.ts`) carries the public props type.

const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'AnimatedText',
  props: {
    effect: { type: null, required: false },
    text: { type: String, required: false },
    split: { type: String, required: false },
    phase: { type: Number, required: false, default: 0 },
    exit: { type: Number, required: false, default: 0 },
    fontSize: { type: Number, required: false, default: 32 },
    fontFamily: { type: String, required: false, default: "monospace" },
    color: { type: String, required: false, default: "#ffffff" },
    total: { type: Number, required: false },
    duration: { type: Number, required: false },
    stagger: { type: Number, required: false },
    ease: { type: String, required: false },
    rise: { type: Number, required: false },
    x: { type: Number, required: false },
    blur: { type: Number, required: false },
    scaleFrom: { type: Number, required: false },
    opacityFrom: { type: Number, required: false },
    exitDuration: { type: Number, required: false },
    exitStagger: { type: Number, required: false },
    exitTotal: { type: Number, required: false },
    exitEase: { type: String, required: false },
    exitRise: { type: Number, required: false },
    exitX: { type: Number, required: false },
    exitBlur: { type: Number, required: false },
    exitScale: { type: Number, required: false },
    exitOpacity: { type: Number, required: false },
    exitStaggerMode: { type: String, required: false }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

// The single generic text-effect SFC. Every catalog effect is one dry object
// (a `TextEffectSpec` from textEffects.ts) passed as the `effect` prop; the
// split target, per-unit timing/easing, renderer ("generic" / "kinetic-*"), and
// line-wrap come off the spec, so no per-effect SFCs are needed.
const props = __props;

const el = ref<HTMLElement | null>(null);

// The split target defaults to the effect's own target; a `split` prop overrides.
const splitTarget = computed(() => props.split ?? props.effect.target);

// Classes on the root let scoped CSS branch by mode without effect-specific
// styles: `lines` (block-laid split lines) and `kinetic` (absolute-centered
// word stacks for the kinetic renderers).
const rootClass = computed(() => {
  const mods: string[] = ["animated-text"];
  if (props.effect.target === "lines") mods.push("target-lines");
  if (props.effect.renderer?.startsWith("kinetic")) mods.push("kinetic");
  return mods.join(" ");
});

const split = useSplitUnits(
  el,
  () =>
    ({
      // Wrap each split line in a static `overflow: clip` container (animejs
      // `lines.wrap`) so lines rise inside their own line box — the "soft masked
      // feel" of mask-reveal-up. Only meaningful for per-line targets.
      [splitTarget.value]: {
        class: `animated-text-unit`,
        ...(props.effect.wrapLines ? { wrap: true } : {}),
      },
    }) as TextSplitterParams,
  {
    units: () => splitTarget.value,
    text: () => props.text,
    // The split is already at its from-state before the first frame's updater
    // runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(resolveEffectKnobs(props.effect, props)),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(props.effect, props),
      staggerMode: () => props.effect.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
      renderer: () => props.effect.renderer,
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// (duration/stagger/ease/…) flow through the phase driver live instead.
watch(
  () => props.split,
  () => split.rebuild(),
);

const __returned__ = { props, el, splitTarget, rootClass, split }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { normalizeClass as _normalizeClass, normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    ref: "el",
    class: _normalizeClass($setup.rootClass),
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 6 /* CLASS, STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-AnimatedText";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text (background-clip: text and overflow: clip line wrappers cut the\n   letters). `normal` makes the line box follow the font's own metrics. */\n.animated-text[data-v-AnimatedText] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n.animated-text[data-v-AnimatedText] span {\n  display: inline-block;\n  will-change: transform, opacity, filter;\n}\n\n/* Per-line targets lay their units as block lines (rising in their own box). */\n.animated-text.target-lines[data-v-AnimatedText] span {\n  display: block;\n}\n\n/* Kinetic builds lay every word absolutely-centered so the measured push /\n   reflow offsets (driven by the per-word MC signals) place the stack. */\n.animated-text.kinetic[data-v-AnimatedText] {\n  display: block;\n}\n.animated-text.kinetic[data-v-AnimatedText] span {\n  position: absolute;\n  left: 50%;\n  top: 50%;\n  white-space: nowrap;\n  display: inline-block;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-AnimatedText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-AnimatedText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
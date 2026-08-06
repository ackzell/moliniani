// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState, type StaggerMode, type TextEffectKnobs } from "../effectTiming";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'RevealText',
  props: {
    text: { type: String, required: false, default: "" },
    split: { type: String, required: false, default: "chars" },
    rise: { type: Number, required: false, default: 40 },
    blur: { type: Number, required: false, default: 0 },
    stagger: { type: Number, required: false, default: 50 },
    duration: { type: Number, required: false, default: 600 },
    total: { type: Number, required: false },
    ease: { type: String, required: false, default: "outExpo" },
    phase: { type: Number, required: false, default: 0 },
    exit: { type: Number, required: false, default: 0 },
    exitDuration: { type: Number, required: false },
    exitStagger: { type: Number, required: false },
    exitTotal: { type: Number, required: false },
    exitEase: { type: String, required: false },
    exitRise: { type: Number, required: false },
    exitX: { type: Number, required: false },
    exitBlur: { type: Number, required: false },
    exitScale: { type: Number, required: false },
    exitOpacity: { type: Number, required: false },
    exitStaggerMode: { type: String, required: false },
    fontSize: { type: Number, required: false, default: 32 },
    fontFamily: { type: String, required: false, default: "monospace" },
    color: { type: String, required: false, default: "#ffffff" }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

const knobs = (): TextEffectKnobs => ({
  duration: props.duration,
  stagger: props.stagger,
  total: props.total,
  ease: props.ease,
  rise: props.rise,
  x: 0,
  blur: props.blur,
  scaleFrom: 1,
  opacityFrom: 0,
  exitDuration: props.exitDuration ?? props.duration,
  exitStagger: props.exitStagger ?? props.stagger,
  exitTotal: props.exitTotal,
  exitEase: props.exitEase ?? props.ease,
  exitRise: props.exitRise ?? 0,
  exitX: props.exitX ?? 0,
  exitBlur: props.exitBlur ?? 0,
  exitScale: props.exitScale ?? 1,
  exitOpacity: props.exitOpacity ?? 0,
});

// Splits the text into the selected unit and animates every unit in from below
// (and optionally out of a blur) with a per-unit stagger, all driven by the
// `phase` signal (0 → 1) and out again by the `exit` signal (0 → 1).
// duration/stagger are milliseconds; `phase = 1` always completes every unit,
// whatever the scene's tween length.
const split = useSplitUnits(
  el,
  () => ({ [props.split]: { class: `reveal-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    // The split is already at its from-state before the first frame's updater
    // runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(knobs()),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs,
      exitStaggerMode: () => props.exitStaggerMode as StaggerMode | undefined,
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// (rise/blur/stagger/duration/ease) flow through the phase driver live.
watch(
  () => props.split,
  () => split.rebuild(),
);

const __returned__ = { props, el, knobs, split }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    ref: "el",
    class: "reveal-text",
    style: _normalizeStyle({
      color: $setup.props.color ?? '#ffffff',
      fontFamily: $setup.props.fontFamily ?? 'monospace',
      fontSize: `${$setup.props.fontSize ?? 32}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-RevealText";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.reveal-text[data-v-RevealText] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n\n/* The split units are injected via innerHTML, so scoped selectors need :deep(). */\n.reveal-text[data-v-RevealText] span {\n  display: inline-block;\n  will-change: transform, opacity;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-RevealText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-RevealText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { MICRO_SCALE_FADE, resolveEffectKnobs } from "../textEffects";
import { fromState } from "../effectTiming";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'MicroScaleFade',
  props: /*@__PURE__*/_mergeDefaults({
    text: { type: String, required: false },
    split: { type: String, required: false },
    phase: { type: Number, required: false },
    exit: { type: Number, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
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
  }, {
    ...MICRO_SCALE_FADE.defaults,
    split: MICRO_SCALE_FADE.target,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  }),
  setup(__props: any, { expose: __expose }) {
  __expose();

// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
const props = __props;

const el = ref<HTMLElement | null>(null);

const split = useSplitUnits(
  el,
  () =>
    ({
      [props.split]: { class: `micro-scale-fade-${props.split}` },
    }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    // The split is already at its from-state before the first frame's
    // updater runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(resolveEffectKnobs(MICRO_SCALE_FADE, props)),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(MICRO_SCALE_FADE, props),
      staggerMode: () => MICRO_SCALE_FADE.staggerMode,
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

const __returned__ = { props, el, split }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    ref: "el",
    class: "micro-scale-fade",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-MicroScaleFade";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text (background-clip: text and overflow: clip line wrappers cut the\n   letters). `normal` makes the line box follow the font's own metrics. */\n.micro-scale-fade[data-v-MicroScaleFade] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n.micro-scale-fade[data-v-MicroScaleFade] span {\n  display: inline-block;\n  will-change: transform, opacity, filter;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-MicroScaleFade")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-MicroScaleFade";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
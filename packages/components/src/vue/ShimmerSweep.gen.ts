// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref } from "vue";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, SHIMMER_SWEEP, type TextEffectProps } from "../textEffects";

// Whole-text shimmer: the headline blends in while gliding from left to center
// (x −22 → 0, blur 8 → 0, opacity 0 → 1) on the signature ease. No split — the
// text is the single animated unit, driven by the `phase` signal (0 → 1); the
// `exit` signal (0 → 1) glides it back out to the right. (The old gradient-band
// sweep is reserved as a future standalone effect — see `wholeValuesAt`.)

const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'ShimmerSweep',
  props: /*@__PURE__*/_mergeDefaults({
    text: { type: String, required: false },
    phase: { type: Number, required: false },
    exit: { type: Number, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
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
    ...SHIMMER_SWEEP.defaults,
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  }),
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

useSplitUnits(el, () => ({}), {
  units: () => "whole",
  unit: () => fromState(resolveEffectKnobs(SHIMMER_SWEEP, props as TextEffectProps)),
  effect: () => ({
    phase: "phase",
    exit: "exit",
    knobs: () => resolveEffectKnobs(SHIMMER_SWEEP, props as TextEffectProps),
    exitStaggerMode: () => props.exitStaggerMode as TextEffectProps["exitStaggerMode"],
  }),
});

const __returned__ = { props, el }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { toDisplayString as _toDisplayString, normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    ref: "el",
    class: "shimmer-sweep",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, _toDisplayString($setup.props.text), 5 /* TEXT, STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-ShimmerSweep";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.shimmer-sweep[data-v-ShimmerSweep] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n  will-change: transform, opacity, filter;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-ShimmerSweep")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-ShimmerSweep";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
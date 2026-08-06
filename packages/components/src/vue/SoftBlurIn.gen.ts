// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, SOFT_BLUR_IN, type TextEffectProps } from "../textEffects";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'SoftBlurIn',
  props: /*@__PURE__*/_mergeDefaults({
    text: { type: String, required: false },
    split: { type: String, required: false },
    phase: { type: Number, required: false },
    exit: { type: Number, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    duration: { type: Number, required: false },
    stagger: { type: Number, required: false },
    total: { type: Number, required: false },
    ease: { type: String, required: false },
    rise: { type: Number, required: false },
    blur: { type: Number, required: false },
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
    ...SOFT_BLUR_IN.defaults,
    split: SOFT_BLUR_IN.target,
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

// Splits the text into the spec's unit and animates every unit from below a
// soft blur, with a per-unit stagger, all driven by the `phase` signal
// (0 → 1) and blurred up out of it by the `exit` signal (0 → 1).
// duration/stagger are milliseconds; `phase = 1` always completes every unit,
// whatever the scene's tween length.
const split = useSplitUnits(
  el,
  () => ({ [props.split]: { class: `soft-blur-in-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    unit: () => fromState(resolveEffectKnobs(SOFT_BLUR_IN, props as TextEffectProps)),
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(SOFT_BLUR_IN, props as TextEffectProps),
      exitStaggerMode: () => props.exitStaggerMode as TextEffectProps["exitStaggerMode"],
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// flow through the phase driver live.
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
    class: "soft-blur-in",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-SoftBlurIn";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.soft-blur-in[data-v-SoftBlurIn] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n\n/* The split units are injected via innerHTML, so scoped selectors need :deep(). */\n.soft-blur-in[data-v-SoftBlurIn] span {\n  display: inline-block;\n  will-change: transform, opacity, filter;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-SoftBlurIn")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-SoftBlurIn";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
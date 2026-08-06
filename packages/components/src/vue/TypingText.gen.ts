// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState } from "../effectTiming";
import { resolveEffectKnobs, TYPING_TEXT, type TextEffectProps } from "../textEffects";

// The catalog "typewriter" effect: chars appear one at a time with a
// `steps(1, end)` easing, so each unit snaps to visible at its stagger delay —
// a deterministic, MC-timeline typewriter (no cursor). Named `TypingText` to
// avoid colliding with the existing `Typewriter` component.

const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'TypingText',
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
    ...TYPING_TEXT.defaults,
    split: TYPING_TEXT.target,
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

const split = useSplitUnits(
  el,
  () => ({ [props.split]: { class: `typing-text-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    unit: () => fromState(resolveEffectKnobs(TYPING_TEXT, props as TextEffectProps)),
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs: () => resolveEffectKnobs(TYPING_TEXT, props as TextEffectProps),
      staggerMode: () => TYPING_TEXT.staggerMode,
      exitStaggerMode: () => props.exitStaggerMode,
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
    class: "typing-text",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-TypingText";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.typing-text[data-v-TypingText] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n.typing-text[data-v-TypingText] span {\n  display: inline-block;\n  will-change: transform, opacity;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-TypingText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-TypingText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
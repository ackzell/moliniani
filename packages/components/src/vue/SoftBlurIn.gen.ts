// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnit } from "../useSplitTextAnimation";
import { buildEffectAnimation, SOFT_BLUR_IN, type TextEffectProps } from "../textEffects";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'SoftBlurIn',
  props: /*@__PURE__*/_mergeDefaults({
    text: { type: String, required: false },
    split: { type: String, required: false },
    progress: { type: Number, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    duration: { type: Number, required: false },
    stagger: { type: Number, required: false },
    ease: { type: String, required: false },
    rise: { type: Number, required: false },
    blur: { type: Number, required: false }
  }, {
    ...SOFT_BLUR_IN.defaults,
    split: SOFT_BLUR_IN.target,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  }),
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

// Splits the text into the spec's unit and animates every unit from below a
// soft blur, with a per-unit stagger, all seeked from the `progress` signal
// (0 → 1). Durations/stagger are animejs milliseconds.
const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `soft-blur-in-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(SOFT_BLUR_IN, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnit,
    text: () => props.text,
  },
);

// Rebuild when props that change the split or timeline shape change; text
// changes are handled inside useSplitTextAnimation().
watch(
  () => [props.split, props.duration, props.stagger, props.ease, props.rise, props.blur],
  () => anime.rebuild(),
);

const __returned__ = { props, el, anime }
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
const __style = "\n.soft-blur-in[data-v-SoftBlurIn] {\n  display: inline-block;\n  white-space: pre;\n}\n\n/* The split units are injected via innerHTML, so scoped selectors need :deep(). */\n.soft-blur-in[data-v-SoftBlurIn] span {\n  display: inline-block;\n  will-change: transform, opacity, filter;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-SoftBlurIn")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-SoftBlurIn";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref } from "vue";
import { useAnime } from "../useAnime";
import { buildEffectAnimation, SHIMMER_SWEEP, type TextEffectProps } from "../textEffects";

// Whole-text shimmer: a gradient highlight band sweeps across the glyphs while
// the title fades in. No split — the text is the single animated unit.

const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'ShimmerSweep',
  props: /*@__PURE__*/_mergeDefaults({
    text: { type: String, required: false },
    progress: { type: Number, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    highlightColor: { type: String, required: false },
    duration: { type: Number, required: false },
    stagger: { type: Number, required: false },
    ease: { type: String, required: false },
    rise: { type: Number, required: false },
    x: { type: Number, required: false },
    blur: { type: Number, required: false },
    scaleFrom: { type: Number, required: false },
    opacityFrom: { type: Number, required: false }
  }, {
    ...SHIMMER_SWEEP.defaults,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
    highlightColor: "#f5d08a",
  }),
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

useAnime(el, () => buildEffectAnimation(SHIMMER_SWEEP, props as TextEffectProps), {
  progress: "progress",
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
      backgroundImage: `linear-gradient(100deg, ${$setup.props.color} 40%, ${$setup.props.highlightColor} 50%, ${$setup.props.color} 60%)`,
      backgroundSize: '200% 100%',
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, _toDisplayString($setup.props.text), 5 /* TEXT, STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-ShimmerSweep";
const __style = "\n.shimmer-sweep[data-v-ShimmerSweep] {\n  display: inline-block;\n  white-space: pre;\n  background-clip: text;\n  -webkit-background-clip: text;\n  -webkit-text-fill-color: transparent;\n  will-change: transform, opacity, filter, background-position;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-ShimmerSweep")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-ShimmerSweep";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
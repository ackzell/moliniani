// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { mergeDefaults as _mergeDefaults, defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnitOrWhole } from "../useSplitTextAnimation";
import { buildEffectAnimation, STAGGER_FROM_EDGES, type TextEffectProps } from "../textEffects";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'StaggerFromEdges',
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
    x: { type: Number, required: false },
    blur: { type: Number, required: false },
    scaleFrom: { type: Number, required: false },
    opacityFrom: { type: Number, required: false }
  }, {
    ...STAGGER_FROM_EDGES.defaults,
    split: STAGGER_FROM_EDGES.target,
    progress: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  }),
  setup(__props: any, { expose: __expose }) {
  __expose();

// Generated once by scripts/gen-text-effect-sfcs.mjs — edit directly.
const props = __props;

const el = ref<HTMLElement | null>(null);

const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `stagger-from-edges-${props.split}` } } as TextSplitterParams;
  },
  () => buildEffectAnimation(STAGGER_FROM_EDGES, props as TextEffectProps),
  {
    progress: "progress",
    units: () => props.split as SplitUnitOrWhole,
    text: () => props.text,
    staggerMode: () => STAGGER_FROM_EDGES.staggerMode,
  },
);

watch(
  () => [
    props.split,
    props.duration,
    props.stagger,
    props.ease,
    props.rise,
    props.x,
    props.blur,
    props.scaleFrom,
    props.opacityFrom,
  ],
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
    class: "stagger-from-edges",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-StaggerFromEdges";
const __style = "\n.stagger-from-edges[data-v-StaggerFromEdges] {\n  display: inline-block;\n  white-space: pre;\n}\n.stagger-from-edges[data-v-StaggerFromEdges] span {\n  display: inline-block;\n  will-change: transform, opacity, filter;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-StaggerFromEdges")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-StaggerFromEdges";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
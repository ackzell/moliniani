// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { AnimationParams, TextSplitterParams } from "animejs";
import { useSplitTextAnimation, type SplitUnit } from "../useSplitTextAnimation";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'RevealText',
  props: {
    text: { type: String, required: false, default: "" },
    split: { type: String, required: false, default: "chars" },
    rise: { type: Number, required: false, default: 40 },
    blur: { type: Number, required: false, default: 0 },
    stagger: { type: Number, required: false, default: 50 },
    duration: { type: Number, required: false, default: 600 },
    ease: { type: String, required: false, default: "outExpo" },
    progress: { type: Number, required: false, default: 0 },
    fontSize: { type: Number, required: false, default: 32 },
    fontFamily: { type: String, required: false, default: "monospace" },
    color: { type: String, required: false, default: "#ffffff" }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

// Splits the text into the selected unit and animates every unit in from below
// (and optionally out of a blur) with a per-unit stagger, all seeked from the
// `progress` signal (0 → 1). Durations/stagger are animejs milliseconds.
const anime = useSplitTextAnimation(
  el,
  () => {
    return { [props.split]: { class: `reveal-${props.split}` } } as TextSplitterParams;
  },
  () => {
    const params: AnimationParams = {
      opacity: [0, 1],
      translateY: [props.rise, 0],
      duration: props.duration,
      ease: props.ease,
      stagger: props.stagger,
    };
    if (props.blur > 0) params.filter = [`blur(${props.blur}px)`, "blur(0px)"];
    return params;
  },
  {
    progress: "progress",
    units: () => props.split as SplitUnit,
    text: () => props.text,
  },
);

// Rebuild when props that change the split or timeline shape change; text
// changes are handled inside useSplitTextAnimation().
watch(
  () => [props.split, props.rise, props.blur, props.stagger, props.duration, props.ease],
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
const __style = "\n.reveal-text[data-v-RevealText] {\n  display: inline-block;\n  white-space: pre;\n}\n\n/* The split units are injected via innerHTML, so scoped selectors need :deep(). */\n.reveal-text[data-v-RevealText] span {\n  display: inline-block;\n  will-change: transform, opacity;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-RevealText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-RevealText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref } from "vue";
import { useAnime } from "../useAnime";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'GlowText',
  props: {
    text: { type: String, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    glowColor: { type: String, required: false },
    glowRadius: { type: Number, required: false },
    progress: { type: Number, required: false }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

// CSS-property port: animates color + text-shadow from animejs params. The
// template owns fontFamily/fontSize; color and textShadow are animejs-owned so
// they never fight Vue's style binding.
useAnime(
  el,
  () => {
    const base = props.color ?? "#ffffff";
    const glow = props.glowColor ?? "rgba(255, 140, 66, 0.9)";
    const radius = props.glowRadius ?? 24;
    return {
      textShadow: [
        "0 0 0px rgba(0, 0, 0, 0)",
        `0 0 ${Math.round(radius * 0.4)}px ${glow}`,
        `0 0 ${radius}px ${glow}`,
      ],
      color: [base, glow, base],
      duration: 1000,
      ease: "inOutQuad",
    };
  },
  { progress: "progress" },
);

const __returned__ = { props, el }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { toDisplayString as _toDisplayString, normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    ref: "el",
    class: "glow-text",
    style: _normalizeStyle({
      fontFamily: $setup.props.fontFamily ?? 'monospace',
      fontSize: `${$setup.props.fontSize ?? 48}px`,
    })
  }, _toDisplayString($setup.props.text), 5 /* TEXT, STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-GlowText";
const __style = "\n.glow-text[data-v-GlowText] {\n  display: inline-block;\n  white-space: pre;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-GlowText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-GlowText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
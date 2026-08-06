// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'

const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'Typewriter',
  props: {
    text: { type: String, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    cursorColor: { type: String, required: false },
    cursorWidth: { type: Number, required: false },
    cursorBlinkSpeed: { type: Number, required: false }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const __returned__ = { props }
Object.defineProperty(__returned__, '__isScriptSetup', { enumerable: false, value: true })
return __returned__
}

})
import { toDisplayString as _toDisplayString, createElementVNode as _createElementVNode, normalizeStyle as _normalizeStyle, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = { class: "typewriter__text" }

function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return (_openBlock(), _createElementBlock("span", {
    class: "typewriter",
    style: _normalizeStyle({
      fontSize: `${$setup.props.fontSize ?? 32}px`,
      fontFamily: $setup.props.fontFamily ?? 'monospace',
      color: $setup.props.color ?? '#ffffff',
    })
  }, [
    _createElementVNode("span", _hoisted_1, _toDisplayString($setup.props.text ?? ""), 1 /* TEXT */),
    _createElementVNode("span", {
      class: "typewriter__cursor",
      style: _normalizeStyle({
        width: `${$setup.props.cursorWidth ?? 2}px`,
        backgroundColor: $setup.props.cursorColor ?? '#ffffff',
        animationDuration: `${$setup.props.cursorBlinkSpeed ?? 0.5}s`,
      })
    }, null, 4 /* STYLE */)
  ], 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-Typewriter";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.typewriter[data-v-Typewriter] {\n  display: inline-flex;\n  align-items: center;\n  white-space: pre;\n  line-height: normal;\n}\n.typewriter__cursor[data-v-Typewriter] {\n  display: inline-block;\n  height: 1em;\n  margin-left: 3px;\n  animation: moliniani-typewriter-blink-Typewriter 0.5s steps(1) infinite;\n}\n@keyframes moliniani-typewriter-blink-Typewriter {\n0%,\n  100% {\n    opacity: 1;\n}\n50% {\n    opacity: 0;\n}\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-Typewriter")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-Typewriter";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
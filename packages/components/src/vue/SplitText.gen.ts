// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitText } from "../useSplitText";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'SplitText',
  props: {
    text: { type: String, required: false },
    split: { type: String, required: false },
    charClass: { type: String, required: false },
    wordClass: { type: String, required: false },
    lineClass: { type: String, required: false },
    debug: { type: Boolean, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

// The generic split canvas: an empty <span> whose content is written and split
// by animejs splitText(), so Vue never re-renders the split subtree. The split
// units carry `data-char` / `data-word` / `data-line` attributes (plus the
// optional per-unit class names) for styling and targeting with effects built
// on top of useSplitText()/useAnime().
const split = useSplitText(
  el,
  () => {
    const units = (props.split ?? "chars").split(/\s+/).filter(Boolean);
    const params: TextSplitterParams = {};
    for (const unit of units) {
      if (unit === "chars") {
        params.chars = props.charClass ? { class: props.charClass } : true;
      } else if (unit === "words") {
        params.words = props.wordClass ? { class: props.wordClass } : true;
      } else if (unit === "lines") {
        params.lines = props.lineClass ? { class: props.lineClass } : true;
      }
    }
    if (props.debug) params.debug = true;
    return params;
  },
  { text: () => props.text ?? "" },
);

// Rebuild when params that change the split shape (which units, what classes)
// change; text changes are handled inside useSplitText().
watch(
  () => [props.split, props.charClass, props.wordClass, props.lineClass],
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
    class: "split-text",
    style: _normalizeStyle({
      color: $setup.props.color ?? '#ffffff',
      fontFamily: $setup.props.fontFamily ?? 'monospace',
      fontSize: `${$setup.props.fontSize ?? 32}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-SplitText";
const __style = "\n.split-text[data-v-SplitText] {\n  display: inline-block;\n  white-space: pre;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-SplitText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-SplitText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
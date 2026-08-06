// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import type { SplitUnitInitialValues } from "../SplitUnitHandle";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'SplitText',
  props: {
    text: { type: String, required: false },
    split: { type: String, required: false },
    unit: { type: Object, required: false },
    charClass: { type: String, required: false },
    wordClass: { type: String, required: false },
    lineClass: { type: String, required: false },
    debug: { type: Boolean, required: false },
    fontSize: { type: Number, required: false },
    fontFamily: { type: String, required: false },
    color: { type: String, required: false },
    splitter: { type: null, required: false }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

// Build the animejs splitter params from `split` + the per-unit class props,
// letting an explicit `splitter` config override the unit settings (e.g.
// `{ chars: { wrap: 'clip', clone: 'bottom' } }` for rolling text).
const splitterParams = (): TextSplitterParams => {
  const units = (props.split ?? "chars").split(/\s+/).filter(Boolean);
  const params: TextSplitterParams = {};
  for (const unit of units) {
    const key = unit === "words" ? "words" : unit === "lines" ? "lines" : "chars";
    const klass =
      key === "words" ? props.wordClass : key === "lines" ? props.lineClass : props.charClass;
    const override = props.splitter?.[key];
    if (override !== undefined) {
      params[key] = override;
    } else if (klass) {
      params[key] = { class: klass };
    } else {
      params[key] = true;
    }
  }
  if (props.debug) params.debug = true;
  return params;
};

// The generic split canvas: an empty <span> whose content is written and split
// by animejs splitText(), so Vue never re-renders the split subtree. Each split
// unit becomes a SplitUnitHandle whose MC signals (opacity/x/y/rotation/scale/
// blur) are synced to its DOM span each frame — tween them with all()/
// sequence()/delay() from the scene.
const split = useSplitUnits(el, splitterParams, {
  units: () => props.split ?? "chars",
  unit: () => props.unit,
  text: () => props.text ?? "",
});

// Rebuild when params that change the split shape (which units, what classes,
// initial values) change; text changes are handled inside useSplitUnits().
watch(
  () => [props.split, props.charClass, props.wordClass, props.lineClass],
  () => split.rebuild(),
);

const __returned__ = { props, el, splitterParams, split }
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
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.split-text[data-v-SplitText] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-SplitText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-SplitText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
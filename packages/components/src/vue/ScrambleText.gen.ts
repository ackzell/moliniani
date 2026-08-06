// @ts-nocheck — generated file, do not hand-edit. Run `pnpm gen` after editing the SFC.
/* eslint-disable */
import { defineComponent as _defineComponent } from 'vue'
import { ref, watch } from "vue";
import { scrambleText } from "animejs";
import { useAnime } from "../useAnime";


const _sfc_main = /*@__PURE__*/_defineComponent({
  __name: 'ScrambleText',
  props: {
    text: { type: String, required: false, default: "" },
    chars: { type: String, required: false },
    override: { type: [String, Boolean], required: false },
    ease: { type: String, required: false },
    from: { type: [String, Number], required: false },
    reversed: { type: Boolean, required: false },
    cursor: { type: [String, Number, Boolean], required: false },
    perturbation: { type: Number, required: false },
    seed: { type: Number, required: false, default: 0 },
    revealRate: { type: Number, required: false },
    settleRate: { type: Number, required: false },
    settleDuration: { type: Number, required: false },
    revealDelay: { type: Number, required: false },
    delay: { type: Number, required: false },
    duration: { type: Number, required: false },
    phase: { type: Number, required: false, default: 0 },
    fontSize: { type: Number, required: false, default: 32 },
    fontFamily: { type: String, required: false, default: "monospace" },
    color: { type: String, required: false, default: "#ffffff" }
  },
  setup(__props: any, { expose: __expose }) {
  __expose();

const props = __props;

const el = ref<HTMLElement | null>(null);

const anime = useAnime(
  el,
  () => ({
    innerHTML: scrambleText({
      text: props.text,
      ...(props.chars !== undefined ? { chars: props.chars } : {}),
      ...(props.override !== undefined ? { override: props.override as any } : {}),
      ...(props.ease !== undefined ? { ease: props.ease as any } : {}),
      ...(props.from !== undefined ? { from: props.from as any } : {}),
      ...(props.reversed !== undefined ? { reversed: props.reversed } : {}),
      ...(props.cursor !== undefined ? { cursor: props.cursor as any } : {}),
      ...(props.perturbation !== undefined ? { perturbation: props.perturbation } : {}),
      seed: props.seed,
      ...(props.revealRate !== undefined ? { revealRate: props.revealRate } : {}),
      ...(props.settleRate !== undefined ? { settleRate: props.settleRate } : {}),
      ...(props.settleDuration !== undefined ? { settleDuration: props.settleDuration } : {}),
      ...(props.revealDelay !== undefined ? { revealDelay: props.revealDelay } : {}),
      ...(props.delay !== undefined ? { delay: props.delay } : {}),
      ...(props.duration !== undefined ? { duration: props.duration } : {}),
    }),
  }),
  // Read phase via the seam's readProp so each rendered frame gets this
  // frame's signal value instead of Vue's one-frame-stale props copy.
  { progress: "phase" },
);

watch(
  () => [props.text, props.seed],
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
    class: "scramble-text",
    style: _normalizeStyle({
      color: $setup.props.color,
      fontFamily: $setup.props.fontFamily,
      fontSize: `${$setup.props.fontSize}px`,
    })
  }, null, 4 /* STYLE */))
}
_sfc_main.render = _sfc_render;
_sfc_main.__scopeId = "data-v-ScrambleText";
const __style = "\n/* MC's editor sets a global line-height (24px) on <body> that the overlay would\n   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of\n   large text. `normal` makes the line box follow the font's own metrics. */\n.scramble-text[data-v-ScrambleText] {\n  display: inline-block;\n  white-space: pre;\n  line-height: normal;\n}\n";
if (typeof document !== "undefined" && !document.getElementById("data-v-ScrambleText")) {
  const __styleEl = document.createElement("style");
  __styleEl.id = "data-v-ScrambleText";
  __styleEl.textContent = __style;
  document.head.appendChild(__styleEl);
}
export default _sfc_main;
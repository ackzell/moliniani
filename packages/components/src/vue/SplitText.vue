<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import type { SplitUnitInitialValues } from "../SplitUnitHandle";

const props = defineProps<{
  text?: string;
  split?: string;
  unit?: Partial<SplitUnitInitialValues>;
  charClass?: string;
  wordClass?: string;
  lineClass?: string;
  debug?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  splitter?: TextSplitterParams;
}>();

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
</script>

<template>
  <span
    ref="el"
    class="split-text"
    :style="{
      color: props.color ?? '#ffffff',
      fontFamily: props.fontFamily ?? 'monospace',
      fontSize: `${props.fontSize ?? 32}px`,
    }"
  />
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text. `normal` makes the line box follow the font's own metrics. */
.split-text {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}
</style>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitText } from "../useSplitText";

const props = defineProps<{
  text?: string;
  split?: string;
  charClass?: string;
  wordClass?: string;
  lineClass?: string;
  debug?: boolean;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}>();

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
.split-text {
  display: inline-block;
  white-space: pre;
}
</style>

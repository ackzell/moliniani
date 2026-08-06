<script setup lang="ts">
import { ref } from "vue";
import { useAnime } from "../useAnime";

const props = withDefaults(
  defineProps<{
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    glowColor?: string;
    glowRadius?: number;
    phase?: number;
  }>(),
  {
    text: "",
    fontSize: 48,
    fontFamily: "monospace",
    color: "#ffffff",
    glowColor: "rgba(255, 140, 66, 0.9)",
    glowRadius: 24,
    phase: 0,
  },
);

const el = ref<HTMLElement | null>(null);

// CSS-property port: animates color + text-shadow from animejs params. The
// template owns fontFamily/fontSize; color and textShadow are animejs-owned so
// they never fight Vue's style binding.
useAnime(
  el,
  () => {
    const base = props.color;
    const glow = props.glowColor;
    const radius = props.glowRadius;
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
  { progress: "phase" },
);
</script>

<template>
  <span
    ref="el"
    class="glow-text"
    :style="{
      fontFamily: props.fontFamily,
      fontSize: `${props.fontSize}px`,
    }"
    >{{ props.text }}</span
  >
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text. `normal` makes the line box follow the font's own metrics. */
.glow-text {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}
</style>

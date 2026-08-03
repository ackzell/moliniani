<script setup lang="ts">
import { ref } from "vue";
import { useAnime } from "../useAnime";

const props = defineProps<{
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  glowColor?: string;
  glowRadius?: number;
  progress?: number;
}>();

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
</script>

<template>
  <span
    ref="el"
    class="glow-text"
    :style="{
      fontFamily: props.fontFamily ?? 'monospace',
      fontSize: `${props.fontSize ?? 48}px`,
    }"
    >{{ props.text }}</span
  >
</template>

<style scoped>
.glow-text {
  display: inline-block;
  white-space: pre;
}
</style>

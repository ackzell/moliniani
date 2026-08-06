<script setup lang="ts">
const props = defineProps<{
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  cursorColor?: string;
  cursorWidth?: number;
  cursorBlinkSpeed?: number;
}>();
</script>

<template>
  <span
    class="typewriter"
    :style="{
      fontSize: `${props.fontSize ?? 32}px`,
      fontFamily: props.fontFamily ?? 'monospace',
      color: props.color ?? '#ffffff',
    }"
  >
    <span class="typewriter__text">{{ props.text ?? "" }}</span>
    <span
      class="typewriter__cursor"
      :style="{
        width: `${props.cursorWidth ?? 2}px`,
        backgroundColor: props.cursorColor ?? '#ffffff',
        animationDuration: `${props.cursorBlinkSpeed ?? 0.5}s`,
      }"
    />
  </span>
</template>

<style scoped>
/* MC's editor sets a global line-height (24px) on <body> that the overlay would
   otherwise inherit; a fixed 24px line box clips the glyph tops and bottoms of
   large text. `normal` makes the line box follow the font's own metrics. */
.typewriter {
  display: inline-flex;
  align-items: center;
  white-space: pre;
  line-height: normal;
}

.typewriter__cursor {
  display: inline-block;
  height: 1em;
  margin-left: 3px;
  animation: moliniani-typewriter-blink 0.5s steps(1) infinite;
}

@keyframes moliniani-typewriter-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
</style>

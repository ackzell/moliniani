<script setup lang="ts">
import { ref, watch } from "vue";
import type { TextSplitterParams } from "animejs";
import { useSplitUnits } from "../useSplitUnits";
import { fromState, type StaggerMode, type TextEffectKnobs } from "../effectTiming";

const props = withDefaults(
  defineProps<{
    text?: string;
    split?: string;
    /** Distance (px) each unit rises from below. Named `rise` because
     *  `offset` is an MC-owned node key (the pivot origin). */
    rise?: number;
    blur?: number;
    stagger?: number;
    duration?: number;
    /** Whole reveal timeline in ms; tweening `phase(1, seconds)` records it. */
    total?: number;
    ease?: string;
    phase?: number;
    exit?: number;
    exitDuration?: number;
    exitStagger?: number;
    exitTotal?: number;
    exitEase?: string;
    exitRise?: number;
    exitX?: number;
    exitBlur?: number;
    exitScale?: number;
    exitOpacity?: number;
    exitStaggerMode?: string;
    fontSize?: number;
    fontFamily?: string;
    color?: string;
  }>(),
  {
    text: "",
    split: "chars",
    rise: 40,
    blur: 0,
    stagger: 50,
    duration: 600,
    ease: "outExpo",
    phase: 0,
    exit: 0,
    fontSize: 32,
    fontFamily: "monospace",
    color: "#ffffff",
  },
);

const el = ref<HTMLElement | null>(null);

const knobs = (): TextEffectKnobs => ({
  duration: props.duration,
  stagger: props.stagger,
  total: props.total,
  ease: props.ease,
  rise: props.rise,
  x: 0,
  blur: props.blur,
  scaleFrom: 1,
  opacityFrom: 0,
  exitDuration: props.exitDuration ?? props.duration,
  exitStagger: props.exitStagger ?? props.stagger,
  exitTotal: props.exitTotal,
  exitEase: props.exitEase ?? props.ease,
  exitRise: props.exitRise ?? 0,
  exitX: props.exitX ?? 0,
  exitBlur: props.exitBlur ?? 0,
  exitScale: props.exitScale ?? 1,
  exitOpacity: props.exitOpacity ?? 0,
});

// Splits the text into the selected unit and animates every unit in from below
// (and optionally out of a blur) with a per-unit stagger, all driven by the
// `phase` signal (0 → 1) and out again by the `exit` signal (0 → 1).
// duration/stagger are milliseconds; `phase = 1` always completes every unit,
// whatever the scene's tween length.
const split = useSplitUnits(
  el,
  () => ({ [props.split]: { class: `reveal-${props.split}` } }) as TextSplitterParams,
  {
    units: () => props.split,
    text: () => props.text,
    // The split is already at its from-state before the first frame's updater
    // runs, so the first render (and any scrub back to 0) is hidden.
    unit: () => fromState(knobs()),
    // Declarative phase driver: the scene tweens the `phase` / `exit` signals
    // and the per-unit MC signals are derived from them each frame — knobs are
    // read fresh, so prop changes need no rebuild.
    effect: () => ({
      phase: "phase",
      exit: "exit",
      knobs,
      exitStaggerMode: () => props.exitStaggerMode as StaggerMode | undefined,
    }),
  },
);

// A split-unit change needs the animejs splitter recreated; knob changes
// (rise/blur/stagger/duration/ease) flow through the phase driver live.
watch(
  () => props.split,
  () => split.rebuild(),
);
</script>

<template>
  <span
    ref="el"
    class="reveal-text"
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
.reveal-text {
  display: inline-block;
  white-space: pre;
  line-height: normal;
}

/* The split units are injected via innerHTML, so scoped selectors need :deep(). */
.reveal-text :deep(span) {
  display: inline-block;
  will-change: transform, opacity;
}
</style>

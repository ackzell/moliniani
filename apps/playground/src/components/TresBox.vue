<!--
  TresBox.vue — demo TresJS scene node for Moliniani.

  This SFC is the Three.js scene *content* — camera, lights, and meshes.
  Do NOT include <TresCanvas> here; TresNode wraps this in one automatically.

  All props become MC timeline signals via defineTresNode(), so they can be
  tweened directly from scene code:

    yield* boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic)
    yield* boxRef().color('#ff4444', 1)
-->
<template>
  <TresPerspectiveCamera :position="[0, 2, 7]" :look-at="[0, 0, 0]" />
  <TresAmbientLight :intensity="1.2" />
  <TresDirectionalLight :position="[5, 8, 5]" :intensity="1.5" cast-shadow />
  <TresMesh :rotation-y="rotationY ?? 0" :rotation-x="rotationX ?? 0">
    <TresBoxGeometry :args="[2, 2, 2]" />
    <TresMeshStandardMaterial :color="color ?? '#4488ff'" />
  </TresMesh>
</template>

<script setup lang="ts">
defineProps<{
  rotationY?: number;
  rotationX?: number;
  color?: string;
}>();
</script>

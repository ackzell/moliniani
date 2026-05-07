<!--
  TresBox.vue — demo TresJS scene node for Moliniani.

  This SFC is the Three.js scene *content* — camera, lights, and meshes.
  Do NOT include <TresCanvas> here; TresNode wraps this in one automatically.

  All props become MC timeline signals via defineTresNode(), so they can be
  tweened directly from scene code:

    yield* boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic)
    yield* boxRef().color('#ff4444', 1)
-->
<script setup lang="ts">
const props = defineProps<{
  rotationY?: number;
  rotationX?: number;
  color?: string;
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
  lookAtX?: number;
  lookAtY?: number;
  lookAtZ?: number;
}>();
</script>

<template>
  <TresPerspectiveCamera
    :position="[props.cameraX ?? 0, props.cameraY ?? 2, props.cameraZ ?? 7]"
    :look-at="[props.lookAtX ?? 0, props.lookAtY ?? 0, props.lookAtZ ?? 0]"
  />
  <TresAmbientLight :intensity="1.2" />
  <TresDirectionalLight :position="[5, 8, 5]" :intensity="1.5" cast-shadow />
  <TresMesh :rotation-y="props.rotationY ?? 0" :rotation-x="props.rotationX ?? 0">
    <TresBoxGeometry :args="[2, 2, 2]" />
    <TresMeshStandardMaterial :color="props.color ?? '#4488ff'" />
  </TresMesh>
</template>

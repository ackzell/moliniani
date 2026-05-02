<script setup lang="ts">
const props = defineProps<{
  label?: string;
  width?: number;
  height?: number;
}>();
</script>

<template>
  <div class="box">
    <span class="my-label">
      {{ props.label }}
    </span>
  </div>
</template>

<style scoped>
.box {
  width: v-bind('props.width ? `${props.width}px` : "100px"');
  height: v-bind('props.height ? `${props.height}px` : "100px"');
  background: green;
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;

  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  transform-origin: center center;
}

.my-label {
  padding: 20px;
  color: greenyellow;
  font-size: 30px;
  text-align: center;
}
</style>

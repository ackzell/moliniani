<script setup lang="ts">
defineProps<{
  label?: string;
  opacity?: number;
}>();
</script>

<template>
  <div class="box" :style="{ opacity: opacity || 1 }">
    <span class="my-label">
      {{ label }}
    </span>
  </div>
</template>

<style scoped>
.box {
  width: 200px;
  height: 200px;
  background: tomato;
  position: absolute;
  top: 100px;
  left: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-label {
  color: gold;
  font-size: 30px;
  text-align: center;
}
</style>

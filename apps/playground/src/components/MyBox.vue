<script setup lang="ts">
const props = defineProps<{
  label?: string;
  width?: number;
  height?: number;
}>();
</script>

<template>
  <div class="box">
    <span class="my-label"> {{ props.label }}</span>
  </div>
</template>

<style scoped>
.box {
  width: v-bind('props.width ? `${props.width}px` : "100px"');
  height: v-bind('props.height ? `${props.height}px` : "100px"');
  background: green;
  display: flex;
  align-items: center;
  justify-content: center;
}

.my-label {
  padding: 20px;
  color: greenyellow;
  font-size: 30px;
  text-align: center;
}
</style>

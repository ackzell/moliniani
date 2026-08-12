# @moliniani/core — Examples

Copy-paste recipes for common authoring patterns. All examples assume a Motion Canvas
scene using `makeScene`.

---

## Hello World

Minimal scene: mount a component, fade it in, wait.

```vue
<!-- components/Label.vue -->
<script setup lang="ts">
defineProps<{ text: string }>();
</script>
<template>
  <div style="color: white; font-size: 48px">{{ text }}</div>
</template>
```

```tsx
// scenes/hello.tsx
import { waitFor } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import Label from "../components/Label.vue";

export default makeScene(function* (view) {
  const label = createMnRef(Label);
  view.add(<Label ref={label} text="Hello, Moliniani" opacity={0} />);

  yield* label().opacity(1, 0.5);
  yield* waitFor(2);
  yield* label().opacity(0, 0.5);
});
```

---

## Animate props

Numeric, color, and string props declared on the SFC become Motion Canvas signals,
so any of them can be tweened on the virtual timeline:

```vue
<!-- components/ProgressBar.vue -->
<script setup lang="ts">
defineProps<{ progress: number; color: string; label: string }>();
</script>
<template>
  <div
    :style="{
      width: progress + 'px',
      height: '8px',
      background: color,
      color: '#fff',
      textAlign: 'center',
    }"
  >
    {{ label }}
  </div>
</template>
```

```tsx
const bar = createMnRef(ProgressBar);
view.add(<ProgressBar ref={bar} progress={0} color="#4caf50" label="Start" />);

yield * bar().progress(480, 2); // animate numeric prop
yield * bar().color("#ff6644", 1); // animate color prop
yield * bar().label("Almost there", 0.5); // animate string prop
```

`opacity` and the other MC transform keys are owned by Motion Canvas — animate them on
the node like any native MC node:

```ts
yield * bar().opacity(0, 0.5);
yield * bar().x(200, 1);
yield * bar().scale(1.5, 0.3);
```

---

## Run animations in parallel

Use Motion Canvas's `all()` to run multiple animations simultaneously.

```ts
import { all } from "@motion-canvas/core";

yield * all(bar().progress(480, 2), bar().opacity(0.5, 1));
```

---

## Mix Vue components with MC 2D nodes

Moliniani does not replace Motion Canvas — it adds Vue on top. The full MC API
(`createRef`, `Rect`, `all`, `chain`, `waitFor`, signals, transitions) is available in
every scene and can be mixed freely with Vue nodes.

```tsx
import { all, createRef, waitFor } from "@motion-canvas/core";
import { Rect } from "@motion-canvas/2d";
import { createMnRef, makeScene } from "@moliniani/core";
import MyBox from "../components/MyBox.vue";

export default makeScene(function* (view) {
  const box = createMnRef(MyBox);
  const rect = createRef<Rect>();

  view.add(
    <>
      <MyBox ref={box} opacity={0} />
      <Rect ref={rect} width={200} height={200} fill="#333" opacity={0} />
    </>,
  );

  yield* all(
    box().opacity(1, 0.5),
    rect().opacity(1, 0.5), // MC node animates with its own API
  );
  yield* waitFor(1);
  yield* all(box().x(300, 1), rect().position.x(300, 1));
});
```

> **Current limitation**: the Vue overlay always composites **above** all MC 2D shapes
> — z-ordering between the two layers is not possible yet (see `ROADMAP.md`).

---

## TresJS 3D scene

A TresJS SFC contains only the Three.js scene content — camera, lights, meshes. Do
**not** include `<TresCanvas>`; `TresNode` provides it.

```vue
<!-- components/TresBox.vue -->
<script setup lang="ts">
defineProps<{
  rotationY?: number;
  color?: string;
  cameraX?: number;
  cameraY?: number;
  cameraZ?: number;
}>();
</script>

<template>
  <TresPerspectiveCamera :position="[props.cameraX ?? 0, props.cameraY ?? 2, props.cameraZ ?? 7]" />
  <TresAmbientLight :intensity="1.2" />
  <TresMesh :rotation-y="props.rotationY ?? 0">
    <TresBoxGeometry :args="[2, 2, 2]" />
    <TresMeshStandardMaterial :color="props.color ?? '#4488ff'" />
  </TresMesh>
</template>
```

```tsx
import { easeInOutCubic } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import TresBox from "../components/TresBox.vue";

export default makeScene(function* (view) {
  const box = createMnRef(TresBox);

  view.add(
    <TresBox
      ref={box}
      rotationY={0}
      color="#4488ff"
      width={700}
      height={500}
      cameraX={0}
      cameraY={2}
      cameraZ={7}
    />,
  );

  yield* box().rotationY(Math.PI * 2, 3, easeInOutCubic);
  yield* box().color("#ff6644", 1, easeInOutCubic);
});
```

TresJS 3D components are detected by their `Tres`-prefixed filename and wrapped with
`defineTresNode()` by the Vite plugin; name 3D scene components accordingly.

---

## Text reveal

Reveal the text of an MC `Txt` node character by character:

```ts
import { createRef } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { revealText } from "@moliniani/core";

const textRef = createRef<Txt>();
view.add(<Txt ref={textRef} fill="#fff">Hello, world!</Txt>);

yield* revealText(textRef(), 1.5);
```

---

## Early unmount

Remove a node before the scene ends:

```tsx
view.add(<Tooltip ref={tooltipRef} text="Hover info" />);
yield * waitFor(2);
tooltipRef().dispose(); // removed immediately
```

The scene's reset lifecycle also cleans up automatically — manual `dispose()` is only
needed when you want to remove the node mid-scene.

---

## Exporting video

Add the Moliniani exporter plugin to your project so composited Vue overlays appear in
exported frames:

```ts
// project.ts
import { makeProject, molinianiExporterPlugin } from "@moliniani/core";

export default makeProject({
  plugins: [molinianiExporterPlugin],
  scenes: [...],
});
```

The exporter is `@moliniani/core/ffmpeg` (set it in the project's render settings).
Import `makeProject` from `@moliniani/core` (not `@motion-canvas/core`) so project- and
scene-level backgrounds resolve.

---

## Dynamic backgrounds

Moliniani backgrounds are full-screen MC nodes that sit behind scene content. Apply
one project-wide via `makeProject(settings, { background })`:

```ts
// project.ts
import { background, makeProject, molinianiExporterPlugin } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

export default makeProject(
  {
    experimentalFeatures: true, // GLSL shader backgrounds need this flag
    plugins: [molinianiExporterPlugin],
    scenes: [...],
  },
  { background: background(GroovySquaresBackground, { color0: "#02020a", color1: "#4a4a8a" }) },
);
```

Or per scene — override the project default, opt out entirely, or pass a configured
descriptor. Use it as a JSX tag for a scene-local instance you want to tween:

```tsx
import { easeInOutCubic } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { FlowFieldBackground } from "@moliniani/components/backgrounds";

export default makeScene(function* (view) {
  const bg = createMnRef(FlowFieldBackground);
  view.add(<FlowFieldBackground ref={bg} />);
  yield* bg().speed(2.4, 1, easeInOutCubic);
});
```

Discover every built-in with the `backgroundCatalog` export from
`@moliniani/components/backgrounds`. All props are tweenable MC signals — they seek,
scrub, and export like native nodes. See the [Backgrounds catalog](../components/README.md#backgrounds-catalog) in `@moliniani/components` for the full
list of built-ins and their props.

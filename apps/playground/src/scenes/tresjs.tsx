import { createRef } from "@motion-canvas/core";
import { all, easeInOutCubic, waitFor } from "@motion-canvas/core";
import { makeScene, mnTres } from "@moliniani/core";
import TresBoxSFC from "@/components/TresBox.vue";

export default makeScene(function* (view) {
  view.fill("#202c31");

  const boxRef = createRef<any>();

  view.add(
    mnTres(TresBoxSFC, boxRef, {
      rotationY: 0,
      rotationX: 0,
      color: "#4488ff",
      width: 700,
      height: 500,
    }),
  );

  yield* waitFor(0.5);

  // Spin the box and tilt it on the MC timeline — no imperative Three.js code.
  yield* all(
    boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic),
    boxRef().rotationX(Math.PI * 0.3, 1.5, easeInOutCubic),
  );

  yield* waitFor(0.5);

  // Tween the material color as an MC signal.
  yield* boxRef().color("#ff6644", 1, easeInOutCubic);

  yield* waitFor(1);
});

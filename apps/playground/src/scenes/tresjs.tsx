import {
  all,
  Direction,
  easeInOutCubic,
  slideTransition,
  waitFor,
  waitUntil,
} from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import TresBoxSFC from "@/components/TresBox.vue";
import MyBox from "@/components/MyBox.vue";

export default makeScene(function* (view) {
  view.fill("#202c31");

  const boxRef = createMnRef(TresBoxSFC);
  const vueBoxRef = createMnRef(MyBox);

  view.add(
    <>
      <TresBoxSFC
        ref={boxRef}
        rotationY={0}
        rotationX={0}
        color="#4488ff"
        cameraX={0}
        cameraY={2}
        cameraZ={7}
        lookAtX={0}
        lookAtY={0}
        lookAtZ={0}
        x={-500}
      />
      <MyBox ref={vueBoxRef} x={500} />
    </>,
  );

  yield* slideTransition(Direction.Left);

  yield* waitUntil("begin");

  yield* all(
    boxRef().cameraX(10, 5, easeInOutCubic),
    boxRef().cameraY(10, 5, easeInOutCubic),
    boxRef().cameraZ(1, 5, easeInOutCubic),

    vueBoxRef().x(0, 5, easeInOutCubic),
  );

  // Spin the box and tilt it on the MC timeline
  // — no imperative Three.js code.
  yield* all(
    boxRef().rotationY(Math.PI * 2, 3, easeInOutCubic),
    boxRef().rotationX(Math.PI * 0.3, 1.5, easeInOutCubic),
  );

  yield* waitFor(0.5);

  yield* all(
    boxRef().cameraX(2, 5, easeInOutCubic),
    boxRef().cameraY(5, 5, easeInOutCubic),
    boxRef().cameraZ(2, 5, easeInOutCubic),
  );

  // Tween the material color as an MC signal.
  yield* boxRef().color("#ff6644", 1, easeInOutCubic);

  yield* waitFor(1);
});

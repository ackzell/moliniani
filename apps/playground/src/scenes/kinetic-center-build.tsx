import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { KineticCenterBuild } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(KineticCenterBuild);

  view.add(
    <>
      <Txt text="kinetic-center-build" fill="#8fa3b8" fontSize={28} y={-420} />
      <KineticCenterBuild
        ref={ref}
        text="Type locks center"
        fontSize={64}
        color="#ffd166"
        y={-60}
        stagger={140}
      />
    </>,
  );

  yield* waitUntil("kinetic-center-build");

  // Each word slides in from the right in sequence (the spec's per-word
  // push/recenter is approximated until the measured build renderer lands).
  yield* ref().progress(1, 1.2, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

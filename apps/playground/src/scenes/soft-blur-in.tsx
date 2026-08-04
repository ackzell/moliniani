import { all, easeInOutCubic, waitFor, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { SoftBlurIn } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(SoftBlurIn);
  const ref2 = createMnRef(SoftBlurIn);

  view.add(
    <>
      <Txt text="soft-blur-in" fill="#8fa3b8" fontSize={28} y={-420} />
      <SoftBlurIn ref={ref} text="Think different." fontSize={64} color="#ffd166" y={-60} />

      <SoftBlurIn
        blur={60}
        ref={ref2}
        text="Think different."
        fontSize={64}
        color="#ffd166"
        y={60}
      />
    </>,
  );

  yield* waitUntil("soft-blur-in");

  // Tweening the progress signal scrubs the seeked animejs timeline, so the
  // reveal is deterministic in the editor and in exported video.
  yield* all(ref().progress(1, 1.4, easeInOutCubic), ref2().progress(1, 1.4, easeInOutCubic));

  yield* waitFor(0.3);

  yield* all(ref().progress(0, 1.4, easeInOutCubic), ref().fontSize(30, 1, easeInOutCubic));

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

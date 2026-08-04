import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { TopDownLetters } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(TopDownLetters);

  view.add(
    <>
      <Txt text="top-down-letters" fill="#8fa3b8" fontSize={28} y={-420} />
      <TopDownLetters ref={ref} text="Signal" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  yield* waitUntil("top-down-letters");

  // Tweening the progress signal scrubs the seeked animejs timeline, so the
  // reveal is deterministic in the editor and in exported video.
  yield* ref().progress(1, 1.2, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

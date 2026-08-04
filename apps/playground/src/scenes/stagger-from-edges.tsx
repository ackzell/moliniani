import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { StaggerFromEdges } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(StaggerFromEdges);

  view.add(
    <>
      <Txt text="stagger-from-edges" fill="#8fa3b8" fontSize={28} y={-420} />
      <StaggerFromEdges ref={ref} text="Edges converge." fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  yield* waitUntil("stagger-from-edges");

  // Tweening the progress signal scrubs the seeked animejs timeline, so the
  // reveal is deterministic in the editor and in exported video.
  yield* ref().progress(1, 1.2, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

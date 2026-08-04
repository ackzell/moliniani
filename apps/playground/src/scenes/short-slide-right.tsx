import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ShortSlideRight } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(ShortSlideRight);

  view.add(
    <>
      <Txt text="short-slide-right" fill="#8fa3b8" fontSize={28} y={-420} />
      <ShortSlideRight ref={ref} text="One more thing" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  yield* waitUntil("short-slide-right");

  // The whole phrase glides in as one shared move; the per-word opacity
  // cascade from the spec's build section is fine-tune pending.
  yield* ref().progress(1, 1.2, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

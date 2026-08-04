import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ShortSlideDown } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(ShortSlideDown);

  view.add(
    <>
      <Txt text="short-slide-down" fill="#8fa3b8" fontSize={28} y={-420} />
      <ShortSlideDown
        ref={ref}
        text="One two three"
        fontSize={64}
        color="#ffd166"
        y={-60}
        stagger={130}
      />
    </>,
  );

  yield* waitUntil("short-slide-down");

  // Each word drops in from above in sequence (the spec's downward stack push
  // is approximated until the measured build renderer lands).
  yield* ref().progress(1, 1.2, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

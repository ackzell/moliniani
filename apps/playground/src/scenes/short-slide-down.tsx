import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ShortSlideDown } from "@moliniani/components/vue";
import { createPhraseSwitcher, SHORT_SLIDE_DOWN } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(ShortSlideDown);

  view.add(
    <>
      <Txt text="short-slide-down" fill="#8fa3b8" fontSize={28} y={-420} />
      <ShortSlideDown ref={ref} text="" fontSize={64} color="#ffd166" y={-60} stagger={130} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SHORT_SLIDE_DOWN);

  yield* t.phrase("short-slide-down-in-1", "short-slide-down-out-1", "Drop into place.");
  yield* t.phrase("short-slide-down-in-2", "short-slide-down-out-2", "Words settle lower.");
  yield* t.phrase("short-slide-down-in-3", "short-slide-down-out-3", "Build from above.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

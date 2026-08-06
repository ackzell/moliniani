import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { MicroScaleFade } from "@moliniani/components/vue";
import { createPhraseSwitcher, MICRO_SCALE_FADE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(MicroScaleFade);

  view.add(
    <>
      <Txt text="micro-scale-fade" fill="#8fa3b8" fontSize={28} y={-420} />
      <MicroScaleFade ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, MICRO_SCALE_FADE);

  yield* t.phrase("micro-scale-fade-in-1", "micro-scale-fade-out-1", "Welcome to motion.");
  yield* t.phrase("micro-scale-fade-in-2", "micro-scale-fade-out-2", "Small details matter.");
  yield* t.phrase("micro-scale-fade-in-3", "micro-scale-fade-out-3", "Quietly premium.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ShimmerSweep } from "@moliniani/components/vue";
import { createPhraseSwitcher, SHIMMER_SWEEP } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(ShimmerSweep);

  view.add(
    <>
      <Txt text="shimmer-sweep" fill="#8fa3b8" fontSize={28} y={-420} />
      <ShimmerSweep ref={ref} text="" fontSize={64} color="#ffffff" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SHIMMER_SWEEP);

  yield* t.phrase("shimmer-sweep-in-1", "shimmer-sweep-out-1", "Shiny details.");
  yield* t.phrase("shimmer-sweep-in-2", "shimmer-sweep-out-2", "Glide with intent.");
  yield* t.phrase("shimmer-sweep-in-3", "shimmer-sweep-out-3", "Soft and precise.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

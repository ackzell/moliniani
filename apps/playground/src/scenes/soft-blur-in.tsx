import { all, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { SoftBlurIn } from "@moliniani/components/vue";
import { createPhraseSwitcher, SOFT_BLUR_IN } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(SoftBlurIn);

  view.add(
    <>
      <Txt text="soft-blur-in" fill="#8fa3b8" fontSize={28} y={-420} />
      <SoftBlurIn ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const a = createPhraseSwitcher(ref, SOFT_BLUR_IN);

  yield* a.phrase("soft-blur-in-in-1", "soft-blur-in-out-1", "Think different.");
  yield* a.phrase("soft-blur-in-in-2", "soft-blur-in-out-2", "Built to flow.");
  yield* a.phrase("soft-blur-in-in-3", "soft-blur-in-out-3", "Motion with intent.");

  yield* waitUntil("next-scene");
  yield* all(ref().opacity(0, 0.5));
});

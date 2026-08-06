import { createMnRef, makeScene } from "@moliniani/core";
import { MaskRevealUp } from "@moliniani/components/vue";
import { createPhraseSwitcher, MASK_REVEAL_UP } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(MaskRevealUp);

  view.add(
    <>
      <Txt text="mask-reveal-up" fill="#8fa3b8" fontSize={28} y={-420} />
      <MaskRevealUp ref={ref} text="" fontSize={64} color="#ffd166" />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, MASK_REVEAL_UP);

  yield* t.phrase(
    "mask-reveal-up-in-1",
    "mask-reveal-up-out-1",
    "Designed to move.\nBuilt to focus.",
  );
  yield* t.phrase(
    "mask-reveal-up-in-2",
    "mask-reveal-up-out-2",
    "Quiet motion.\nStrong hierarchy.",
  );
  yield* t.phrase("mask-reveal-up-in-3", "mask-reveal-up-out-3", "Premium feel.\nEvery frame.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

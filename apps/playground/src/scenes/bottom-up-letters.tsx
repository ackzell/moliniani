import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { BottomUpLetters } from "@moliniani/components/vue";
import { BOTTOM_UP_LETTERS, createPhraseSwitcher } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(BottomUpLetters);

  view.add(
    <>
      <Txt text="bottom-up-letters" fill="#8fa3b8" fontSize={28} y={-420} />
      <BottomUpLetters ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, BOTTOM_UP_LETTERS);

  yield* t.phrase("bottom-up-letters-in-1", "bottom-up-letters-out-1", "Shift");
  yield* t.phrase("bottom-up-letters-in-2", "bottom-up-letters-out-2", "Stage");
  yield* t.phrase("bottom-up-letters-in-3", "bottom-up-letters-out-3", "Letter");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

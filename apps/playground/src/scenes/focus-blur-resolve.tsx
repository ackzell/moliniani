import { createMnRef, makeScene } from "@moliniani/core";
import { FocusBlurResolve } from "@moliniani/components/vue";
import { createPhraseSwitcher, FOCUS_BLUR_RESOLVE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(FocusBlurResolve);

  view.add(
    <>
      <Txt text="focus-blur-resolve" fill="#8fa3b8" fontSize={28} y={-420} />
      <FocusBlurResolve ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, FOCUS_BLUR_RESOLVE);

  yield* t.phrase("focus-blur-resolve-in-1", "focus-blur-resolve-out-1", "Focus resolves clearly.");
  yield* t.phrase("focus-blur-resolve-in-2", "focus-blur-resolve-out-2", "Detail emerges.");
  yield* t.phrase("focus-blur-resolve-in-3", "focus-blur-resolve-out-3", "Then softly recedes.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

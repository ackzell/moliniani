import { createMnRef, makeScene } from "@moliniani/core";
import { BlurOutUp } from "@moliniani/components/vue";
import { BLUR_OUT_UP, createPhraseSwitcher } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(BlurOutUp);

  view.add(
    <>
      <Txt text="blur-out-up" fill="#8fa3b8" fontSize={28} y={-420} />
      <BlurOutUp ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, BLUR_OUT_UP);

  yield* t.phrase("blur-out-up-in-1", "blur-out-up-out-1", "Clear in, airy out.");
  yield* t.phrase("blur-out-up-in-2", "blur-out-up-out-2", "Lightweight typography.");
  yield* t.phrase("blur-out-up-in-3", "blur-out-up-out-3", "Exit with grace.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

import { createMnRef, makeScene } from "@moliniani/core";
import { TypingText } from "@moliniani/components/vue";
import { createPhraseSwitcher, TYPING_TEXT } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(TypingText);

  view.add(
    <>
      <Txt text="typewriter" fill="#8fa3b8" fontSize={28} y={-420} />
      <TypingText ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, TYPING_TEXT);

  yield* t.phrase("typewriter-in-1", "typewriter-out-1", "Precision in motion.");
  yield* t.phrase("typewriter-in-2", "typewriter-out-2", "Write. Pause. Continue.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

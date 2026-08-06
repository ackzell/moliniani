import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { PerCharacterRise } from "@moliniani/components/vue";
import { createPhraseSwitcher, PER_CHARACTER_RISE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(PerCharacterRise);

  view.add(
    <>
      <Txt text="per-character-rise" fill="#8fa3b8" fontSize={28} y={-420} />
      <PerCharacterRise ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, PER_CHARACTER_RISE);

  yield* t.phrase("per-character-rise-in-1", "per-character-rise-out-1", "One more thing.");
  yield* t.phrase("per-character-rise-in-2", "per-character-rise-out-2", "Fast and fluid.");
  yield* t.phrase("per-character-rise-in-3", "per-character-rise-out-3", "Sharp by design.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

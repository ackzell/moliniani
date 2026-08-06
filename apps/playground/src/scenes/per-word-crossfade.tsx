import { createMnRef, makeScene } from "@moliniani/core";
import { PerWordCrossfade } from "@moliniani/components/vue";
import { createPhraseSwitcher, PER_WORD_CROSSFADE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(PerWordCrossfade);

  view.add(
    <>
      <Txt text="per-word-crossfade" fill="#8fa3b8" fontSize={28} y={-420} />
      <PerWordCrossfade ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, PER_WORD_CROSSFADE);

  yield* t.phrase("per-word-crossfade-in-1", "per-word-crossfade-out-1", "Beautifully simple.");
  yield* t.phrase("per-word-crossfade-in-2", "per-word-crossfade-out-2", "Designed for focus.");
  yield* t.phrase("per-word-crossfade-in-3", "per-word-crossfade-out-3", "Built for people.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

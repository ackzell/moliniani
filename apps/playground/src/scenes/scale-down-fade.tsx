import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ScaleDownFade } from "@moliniani/components/vue";
import { createPhraseSwitcher, SCALE_DOWN_FADE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(ScaleDownFade);

  view.add(
    <>
      <Txt text="scale-down-fade" fill="#8fa3b8" fontSize={28} y={-420} />
      <ScaleDownFade ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SCALE_DOWN_FADE);

  yield* t.phrase("scale-down-fade-in-1", "scale-down-fade-out-1", "Quietly refined.");
  yield* t.phrase("scale-down-fade-in-2", "scale-down-fade-out-2", "Polished transitions.");
  yield* t.phrase("scale-down-fade-in-3", "scale-down-fade-out-3", "A soft close.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

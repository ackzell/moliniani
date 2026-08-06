import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { SpringScaleIn } from "@moliniani/components/vue";
import { createPhraseSwitcher, SPRING_SCALE_IN } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(SpringScaleIn);

  view.add(
    <>
      <Txt text="spring-scale-in" fill="#8fa3b8" fontSize={28} y={-420} />
      <SpringScaleIn ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SPRING_SCALE_IN);

  yield* t.phrase("spring-scale-in-in-1", "spring-scale-in-out-1", "Fast. Crisp. Fluid.");
  yield* t.phrase("spring-scale-in-in-2", "spring-scale-in-out-2", "Pop into place.");
  yield* t.phrase("spring-scale-in-in-3", "spring-scale-in-out-3", "Smooth by default.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

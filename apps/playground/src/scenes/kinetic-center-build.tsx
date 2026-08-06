import { waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { KineticCenterBuild } from "@moliniani/components/vue";
import { createPhraseSwitcher, KINETIC_CENTER_BUILD } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(KineticCenterBuild);

  view.add(
    <>
      <Txt text="kinetic-center-build" fill="#8fa3b8" fontSize={28} y={-420} />
      <KineticCenterBuild ref={ref} text="" fontSize={64} color="#ffd166" y={-60} stagger={140} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, KINETIC_CENTER_BUILD);

  yield* t.phrase("kinetic-center-build-in-1", "kinetic-center-build-out-1", "Words push left.");
  yield* t.phrase("kinetic-center-build-in-2", "kinetic-center-build-out-2", "Type locks center.");
  yield* t.phrase("kinetic-center-build-in-3", "kinetic-center-build-out-3", "Build the line.");

  yield* waitUntil("next-scene");
  yield* ref().opacity(0, 0.5);
});

import { createMnRef, makeScene } from "@moliniani/core";
import { SharedAxisY } from "@moliniani/components/vue";
import { createPhraseSwitcher, SHARED_AXIS_Y } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(SharedAxisY);

  view.add(
    <>
      <Txt text="shared-axis-y" fill="#8fa3b8" fontSize={28} y={-420} />
      <SharedAxisY ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SHARED_AXIS_Y);

  yield* t.phrase("shared-axis-y-in-1", "shared-axis-y-out-1", "Layered navigation.");
  yield* t.phrase("shared-axis-y-in-2", "shared-axis-y-out-2", "Hierarchy made clear.");
  yield* t.phrase("shared-axis-y-in-3", "shared-axis-y-out-3", "Depth with restraint.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

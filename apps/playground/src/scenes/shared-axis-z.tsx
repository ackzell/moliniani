import { createMnRef, makeScene } from "@moliniani/core";
import { SharedAxisZ } from "@moliniani/components/vue";
import { createPhraseSwitcher, SHARED_AXIS_Z } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(SharedAxisZ);

  view.add(
    <>
      <Txt text="shared-axis-z" fill="#8fa3b8" fontSize={28} y={-420} />
      <SharedAxisZ ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, SHARED_AXIS_Z);

  yield* t.phrase("shared-axis-z-in-1", "shared-axis-z-out-1", "Zooming between states.");
  yield* t.phrase("shared-axis-z-in-2", "shared-axis-z-out-2", "Elevate and settle.");
  yield* t.phrase("shared-axis-z-in-3", "shared-axis-z-out-3", "Scale with purpose.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

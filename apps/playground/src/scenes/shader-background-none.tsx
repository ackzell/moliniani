import { Txt } from "@motion-canvas/2d";
import { makeScene } from "@moliniani/core";
import { waitFor } from "@motion-canvas/core";

// Opt-out: `{ background: false }` disables the project-wide default for this
// scene, so no dynamic background renders here.
export default makeScene(
  function* (view) {
    view.fill("#1a1a2e");
    view.add(
      <Txt text="no background (opt-out)" fill="#ffffff" fontSize={48} fontFamily="monospace" />,
    );

    yield* waitFor(2);
  },
  { background: false },
);

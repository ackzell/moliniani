import { makeScene } from "@moliniani/core";
import { easeInCubic, waitFor } from "@motion-canvas/core";
import { RevealText } from "@moliniani/components/vue";
import { createMnRef } from "@moliniani/core";

// Opt-out: `{ background: false }` disables the project-wide default for this
// scene, so no dynamic background renders here.
export default makeScene(
  function* (view) {
    view.fill("#1a1a2e");

    const titleRef = createMnRef(RevealText);

    view.add(
      <RevealText
        ref={titleRef}
        text="no background (opt-out)"
        color="#ffffff"
        fontSize={48}
        fontFamily="monospace"
      />,
    );

    yield* titleRef().phase(1, 1.2, easeInCubic);

    yield* waitFor(2);
  },
  { background: false },
);

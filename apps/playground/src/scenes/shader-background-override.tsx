import { Txt } from "@motion-canvas/2d";
import { background, makeScene } from "@moliniani/core";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";
import { waitFor } from "@motion-canvas/core";

// Per-scene override: this scene replaces the project-wide background with its
// own, reconfiguring the same GroovySquares class with different props via a
// `background()` descriptor (nodes can only be constructed inside a live scene,
// so this lazy config is materialized per scene at generator time).
export default makeScene(
  function* (view) {
    view.add(
      <Txt
        text="per-scene override (configured)"
        fill="#ffffff"
        fontSize={48}
        fontFamily="monospace"
      />,
    );

    yield* waitFor(2);
  },
  {
    background: background(GroovySquaresBackground, {
      color0: "#c36f00",
      color1: "#3e0303",
      density: 25,
      speed: 3,
    }),
  },
);

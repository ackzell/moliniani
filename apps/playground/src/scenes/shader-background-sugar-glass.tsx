import { createMnRef, makeScene } from "@moliniani/core";
import { createRef, easeInOutCubic, waitFor, waitUntil } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { SugarGlassBackground } from "@moliniani/components/backgrounds";

// The SugarGlass background: a faithful GLSL port of the "Sugar Glass" sketch —
// caramelized glass riven by animated macro/micro Voronoi fracture networks,
// with warm light bleeding through the cracks. Scrub-correct and deterministic
// like any native node. Mount it, tween its props as signals, render freely.
export default makeScene(
  function* (view) {
    const titleRef = createRef<Txt>();
    const bgRef = createMnRef(SugarGlassBackground);

    view.add(
      <>
        <SugarGlassBackground ref={bgRef} crackSpeed={0.8} opacity={0.2} color0="black" />

        <Txt
          text="SugarGlassBackground — Voronoi fracture port"
          ref={titleRef}
          fill="#ffffff"
          fontSize={48}
          fontFamily="monospace"
        />

        <Txt
          text="tween crackSpeed / lightBleed / density / colors — the shards rebuild deterministically"
          fill="#ffffff"
          opacity={0.75}
          fontSize={24}
          fontFamily="monospace"
          y={64}
        />
      </>,
    );

    yield* waitFor(2);
    yield* bgRef().lightBleed(1.8, 2, easeInOutCubic);
    yield* bgRef().density(0.5, 2, easeInOutCubic);
    yield* bgRef().crackColor("#42d3ff", 2, easeInOutCubic);
    yield* bgRef().color1("#a0efff", 2, easeInOutCubic);

    yield* waitUntil("next-scene");
  },
  {
    background: false,
  },
);

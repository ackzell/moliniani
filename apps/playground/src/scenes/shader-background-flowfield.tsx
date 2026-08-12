import { createMnRef, makeScene } from "@moliniani/core";
import { createRef, easeInOutCubic, waitFor, waitUntil } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { FlowFieldBackground } from "@moliniani/components/backgrounds";

// The FlowField background: a faithful Canvas-2D port of the "Flow Field with
// Particle Trails" sketch — warm amber/gold particle trails drifting on a
// slow-morphing noise field, scrub-correct and deterministic like any native
// node. Mount it, tween its props as signals, render/scrape freely.
export default makeScene(
  function* (view) {
    const titleRef = createRef<Txt>();
    const bgRef = createMnRef(FlowFieldBackground);

    view.add(
      <>
        <FlowFieldBackground ref={bgRef} speed={1} opacity={1} noiseScale={0.01} />

        <Txt
          text="FlowFieldBackground — faithful particle-trail port"
          ref={titleRef}
          fill="#ffffff"
          fontSize={48}
          fontFamily="monospace"
        />

        <Txt
          text="tween speed / noiseScale / color / particleCount — trails rebuild deterministically"
          fill="#ffffff"
          opacity={0.75}
          fontSize={24}
          fontFamily="monospace"
          y={64}
        />
      </>,
    );

    yield* waitFor(2);
    yield* bgRef().speed(2.4, 3, easeInOutCubic);
    yield* bgRef().noiseScale(0.004, 3, easeInOutCubic);
    yield* bgRef().color2("#42d3ff", 2, easeInOutCubic);
    yield* bgRef().speed(1.2, 2, easeInOutCubic);

    yield* waitUntil("next-scene");
  },
  {
    background: false,
  },
);

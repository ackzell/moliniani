import { createMnRef, makeScene } from "@moliniani/core";
import { createRef, easeInOutCubic, waitFor, waitUntil } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { KineticGridBackground } from "@moliniani/components/backgrounds";

// The KineticGrid background: a faithful Canvas-2D port of the "Kinetic Grid"
// sketch — a neon spring-mesh with periodic edge impulses rippling through the
// lattice, connecting lines lighting from rust to white-hot as they stretch.
// Scrub-correct and deterministic like any native node. Mount it, tween its
// props as signals, render freely.
export default makeScene(function* (view) {
  const titleRef = createRef<Txt>();
  const bgRef = createMnRef(KineticGridBackground);

  view.add(
    <>
      <KineticGridBackground ref={bgRef} impulseRate={0.3} />

      <Txt
        text="KineticGridBackground — neon spring-mesh port"
        ref={titleRef}
        fill="#ffffff"
        fontSize={48}
        fontFamily="monospace"
        opacity={1}
      />

      <Txt
        text="tween impulseRate / springTension / impulseForce / colors — the mesh rebuilds deterministically"
        fill="#ffffff"
        opacity={0.75}
        fontSize={24}
        fontFamily="monospace"
        y={64}
      />
    </>,
  );

  yield* waitFor(2);
  // yield* bgRef().impulseRate(1.6, 2, easeInOutCubic);
  // yield* bgRef().springTension(1.6, 2, easeInOutCubic);
  yield* bgRef().lineColor1("#42d3ff", 2, easeInOutCubic);
  // yield* bgRef().impulseRate(0.7, 2, easeInOutCubic);

  yield* waitUntil("next-scene");
});

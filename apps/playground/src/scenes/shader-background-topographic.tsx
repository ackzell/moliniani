import { createMnRef, makeScene } from "@moliniani/core";
import { createRef, easeInOutCubic, waitFor, waitUntil } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { TopographicBackground } from "@moliniani/components/backgrounds";

// The Topographic background: a faithful Canvas-2D port of the "Topographic
// Contour Map" sketch — amber contour rings extracted with marching squares from
// a morphing simplex field, with etched elevation labels, scrub-correct and
// deterministic like any native node. Mount it, tween its props as signals,
// render/scrape freely.
export default makeScene(function* (view) {
  const titleRef = createRef<Txt>();
  const bgRef = createMnRef(TopographicBackground);

  view.add(
    <>
      <TopographicBackground ref={bgRef} contours={4} />

      <Txt
        text="TopographicBackground — marching-squares contour port"
        ref={titleRef}
        fill="#ffffff"
        fontSize={48}
        fontFamily="monospace"
      />

      <Txt
        text="tween contours / speed / noiseScale / color / labels — the map rebuilds deterministically"
        fill="#ffffff"
        opacity={0.75}
        fontSize={24}
        fontFamily="monospace"
        y={64}
      />
    </>,
  );

  yield* waitFor(2);
  yield* bgRef().contours(30, 3, easeInOutCubic);
  yield* bgRef().color2("#42d3ff", 2, easeInOutCubic);
  yield* bgRef().labels(0.3, 2, easeInOutCubic);
  yield* bgRef().labelSize(16, 2, easeInOutCubic);
  yield* bgRef().speed(0.15, 2, easeInOutCubic);

  yield* waitUntil("next-scene");
});

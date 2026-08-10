import { createMnRef, makeScene } from "@moliniani/core";
import { createRef, easeInOutCubic, easeInSine, waitFor, waitUntil } from "@motion-canvas/core";
import { Txt } from "@motion-canvas/2d";
import { GroovySquaresBackground } from "@moliniani/components/backgrounds";

// A governed background (the project-wide default, or a `background(Ctor, props)`
// descriptor) is configured statically with no node ref. To tween its props
// live, mount your own instance — same node, same defaults, fully tweenable.
export default makeScene(function* (view) {
  const titleRef = createRef<Txt>();
  const bgRef = createMnRef(GroovySquaresBackground);

  view.add(
    <>
      <GroovySquaresBackground ref={bgRef} color0="#bada55" speed={2} />

      <Txt
        text="dynamic background, mounted + tweened locally"
        ref={titleRef}
        fill="#ffffff"
        fontSize={48}
        fontFamily="monospace"
      />

      <Txt
        text="(same node the project-wide default uses — tween speed!)"
        fill="#ffffff"
        opacity={0.75}
        fontSize={24}
        fontFamily="monospace"
        y={64}
      />
    </>,
  );

  yield* waitFor(2);
  yield* bgRef().speed(2.1, 3, easeInSine);
  yield* bgRef().speed(2, 3, easeInSine);

  yield* waitUntil("next-scene");
});

import { easeInOutCubic, useDuration, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { GlowText } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#17231c");

  const glowRef = createMnRef(GlowText);

  view.add(
    <>
      <Txt text="animejs <GlowText>" fill="#8fa3b8" fontSize={28} y={-420} />
      <GlowText
        ref={glowRef}
        text="power up"
        fontSize={64}
        color="#ffffff"
        glowColor="rgba(255, 180, 90, 0.95)"
        glowRadius={36}
      />
    </>,
  );

  // Same bookmark pattern as the scramble scene: the gap between the "glow" and
  // "glowDur" bookmarks in glow.meta controls when it starts and how long it
  // takes to reach full glow.
  yield* waitUntil("glow");

  const glowDuration = useDuration("glowDur");
  yield* glowRef().phase(1, glowDuration, easeInOutCubic);

  yield* glowRef().opacity(0, 0.5);
});

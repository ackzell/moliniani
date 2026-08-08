import { easeInOutCubic, useDuration, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { ScrambleText } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#203128");

  const scrambleRef = createMnRef(ScrambleText);

  view.add(
    <>
      <Txt text="animejs <ScrambleText>" fill="#8fa3b8" fontSize={28} y={-420} />
      <ScrambleText
        ref={scrambleRef}
        text="scramble text from animejs"
        seed={42}
        fontSize={48}
        color="#ff8c42"
        from="center"
        cursor="░▒▓█"
        revealRate={20}
      />
    </>,
  );

  // The scramble starts here. The "scramble" and "scrambleDur" bookmarks in
  // scramble.meta control the trigger time and the animation length: the tween
  // runs for whatever gap you leave between them in the editor.
  yield* waitUntil("scramble");

  const scrambleDuration = useDuration("scrambleDur");
  yield* scrambleRef().phase(1, scrambleDuration, easeInOutCubic);

  yield* scrambleRef().phase(0, scrambleDuration, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* scrambleRef().opacity(0, 0.5);
});

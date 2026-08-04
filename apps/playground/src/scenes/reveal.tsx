import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { RevealText } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const charsRef = createMnRef(RevealText);
  const wordsRef = createMnRef(RevealText);

  view.add(
    <>
      <Txt text="<RevealText>" fill="#8fa3b8" fontSize={28} y={-420} />
      <Txt text="chars" fill="#5a87ff" fontSize={20} y={-210} />
      <RevealText
        ref={charsRef}
        text="reveal per character"
        split="chars"
        stagger={40}
        duration={600}
        rise={40}
        fontSize={48}
        color="#ff8c42"
        y={-120}
      />
      <Txt text="words + blur" fill="#00d672" fontSize={20} y={90} />
      <RevealText
        ref={wordsRef}
        text="reveal per word"
        split="words"
        stagger={120}
        duration={700}
        rise={24}
        blur={12}
        fontSize={48}
        color="#9fd6ff"
        y={180}
      />
    </>,
  );

  yield* waitUntil("reveal");

  // Tweening the progress signal scrubs the seeked animejs timeline, so the
  // reveal is deterministic in the editor and in exported video.
  yield* charsRef().progress(1, 1.2, easeInOutCubic);
  yield* wordsRef().progress(1, 1.5, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* charsRef().opacity(0, 0.5);
  yield* wordsRef().opacity(0, 0.5);
});

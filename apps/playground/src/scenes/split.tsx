import { easeInOutCubic, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { SplitText } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#1d2b33");

  const charsRef = createMnRef(SplitText);
  const wordsRef = createMnRef(SplitText);

  view.add(
    <>
      <Txt text="animejs splitText()" fill="#8fa3b8" fontSize={28} y={-420} />
      <Txt text="chars" fill="#5a87ff" fontSize={20} y={-210} />
      <SplitText
        ref={charsRef}
        text="split into characters"
        split="chars"
        charClass="split-char"
        debug
        fontSize={48}
        color="#ff8c42"
        y={-120}
      />
      <Txt text="words" fill="#00d672" fontSize={20} y={90} />
      <SplitText
        ref={wordsRef}
        text="split into words"
        split="words"
        wordClass="split-word"
        fontSize={48}
        color="#9fd6ff"
        y={180}
        debug
      />
    </>,
  );

  yield* waitUntil("split");

  // Changing the text prop re-splits in place; the split units rebuild to the
  // new string (tween a string signal to morph the split target).
  yield* charsRef().text("rebuilds on text change", 0.5, easeInOutCubic);
  yield* wordsRef().text("no matter the split unit", 0.5, easeInOutCubic);

  yield* waitUntil("next-scene");
  yield* charsRef().opacity(0, 0.5);
  yield* wordsRef().opacity(0, 0.5);
});

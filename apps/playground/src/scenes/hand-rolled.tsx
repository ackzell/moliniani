import { all, delay, easeOutBack, easeOutCubic, sequence, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene } from "@moliniani/core";
import { SplitText } from "@moliniani/components/vue";
import { Txt } from "@motion-canvas/2d";

export default makeScene(
  function* (view) {
    view.fill("#1d2b33");

    const charsRef = createMnRef(SplitText);
    const wordsRef = createMnRef(SplitText);

    view.add(
      <>
        <Txt
          text="hand-rolled — tween per-unit handles from the scene"
          fill="#8fa3b8"
          fontSize={28}
          y={-420}
        />
        <Txt text="chars: opacity + y (staggered)" fill="#5a87ff" fontSize={20} y={-210} />
        <SplitText
          ref={charsRef}
          text="animate by char"
          split="chars"
          charClass="hand-char"
          unit={{ opacity: 0, x: 40, rotation: -16 }}
          fontSize={48}
          color="#ff8c42"
          y={-120}
        />
        <Txt text="words: rotation + blur flourish" fill="#00d672" fontSize={20} y={90} />
        <SplitText
          ref={wordsRef}
          text="animate full words in a phrase"
          split="words"
          wordClass="hand-word"
          unit={{ opacity: 0, rotation: -8, blur: 6 }}
          fontSize={48}
          color="#9fd6ff"
          y={180}
        />
      </>,
    );

    yield* waitUntil("hand-rolled");

    // No Vue component and no effect registry: the scene tweening the per-unit MC
    // signals directly. Each unit is a real Motion Canvas signal, so this seeks,
    // scrubs, and exports deterministically. The `unit` prop only seeds the "from"
    // state; everything after is composed here with all()/sequence()/delay().
    const chars = charsRef().units;
    yield* sequence(
      0.1,
      ...chars.map((u, i) => delay(i * 0.03, u.opacity(1, 0.4, easeOutCubic))),
      ...chars.map((u, i) => delay(i * 0.03, u.y(0, 0.35, easeOutBack))),
      ...chars.map((u, i) => delay(i * 0.03, u.rotation(0, 0.35, easeOutBack))),
    );

    const words = wordsRef().units;
    yield* all(
      ...words.map((u, i) => delay(i * 0.06, u.opacity(1, 0.4, easeOutCubic))),
      ...words.map((u, i) => delay(i * 0.06, u.rotation(0, 0.5, easeOutBack))),
      ...words.map((u, i) => delay(i * 0.06, u.blur(0, 0.5, easeOutCubic))),
    );

    yield* waitUntil("next-scene");
    yield* charsRef().opacity(0, 0.5);
    yield* wordsRef().opacity(0, 0.5);
  },
  { background: false },
);

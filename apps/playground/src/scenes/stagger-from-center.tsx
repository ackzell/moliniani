import { createMnRef, makeScene } from "@moliniani/core";
import { AnimatedText } from "@moliniani/components/vue";
import { createPhraseSwitcher, STAGGER_FROM_CENTER } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(AnimatedText);

  view.add(
    <>
      <Txt text="stagger-from-center" fill="#8fa3b8" fontSize={28} y={-420} />
      <AnimatedText
        ref={ref}
        effect={STAGGER_FROM_CENTER}
        text=""
        fontSize={64}
        color="#ffd166"
        y={-60}
      />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref);

  yield* t.phrase("From the middle.");
  yield* t.phrase("Ripple outward.");
  yield* t.phrase("Center-first motion.", {
    exitOn: "next-scene",
  });

  yield* ref().opacity(0, 0.5);
});

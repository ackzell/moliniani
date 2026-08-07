import { createMnRef, makeScene } from "@moliniani/core";
import { AnimatedText } from "@moliniani/components/vue";
import { createPhraseSwitcher, LINE_BY_LINE_SLIDE } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(AnimatedText);

  view.add(
    <>
      <Txt text="line-by-line-slide" fill="#8fa3b8" fontSize={28} y={-420} />
      <AnimatedText
        ref={ref}
        effect={LINE_BY_LINE_SLIDE}
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

  yield* t.phrase("Think different.\nDo more.");
  yield* t.phrase("Built for speed.\nMade to last.");
  yield* t.phrase("Clear ideas.\nClean motion.", { exitOn: "next-scene" });

  yield* ref().opacity(0, 0.5);
});

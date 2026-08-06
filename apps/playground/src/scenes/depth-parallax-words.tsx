import { createMnRef, makeScene } from "@moliniani/core";
import { DepthParallaxWords } from "@moliniani/components/vue";
import { createPhraseSwitcher, DEPTH_PARALLAX_WORDS } from "@moliniani/components";
import { Txt } from "@motion-canvas/2d";

export default makeScene(function* (view) {
  view.fill("#22263d");

  const ref = createMnRef(DepthParallaxWords);

  view.add(
    <>
      <Txt text="depth-parallax-words" fill="#8fa3b8" fontSize={28} y={-420} />
      <DepthParallaxWords ref={ref} text="" fontSize={64} color="#ffd166" y={-60} />
    </>,
  );

  // Phrase slots are driven by two markers per phrase on the MC timeline:
  // `in` (the audio beat / start frame) and `out` (where the enter completes
  // and the exit starts). Enter and exit lengths derive from the markers
  // (`enter = out − in`, `exit = nextIn − out`), so dragging a marker re-times
  // the reveal or the exit gap in the editor.
  const t = createPhraseSwitcher(ref, DEPTH_PARALLAX_WORDS);

  yield* t.phrase("depth-parallax-words-in-1", "depth-parallax-words-out-1", "Layered depth.");
  yield* t.phrase("depth-parallax-words-in-2", "depth-parallax-words-out-2", "Words in motion.");
  yield* t.phrase(
    "depth-parallax-words-in-3",
    "depth-parallax-words-out-3",
    "Perspective shifts.",
    {
      exitOn: "next-scene",
    },
  );

  yield* ref().opacity(0, 0.5);
});

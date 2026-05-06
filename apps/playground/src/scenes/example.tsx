import { createRef, sequence, waitUntil } from "@motion-canvas/core";
import { createVueRef, mnVue, makeScene } from "@moliniani/core";
import { Rect, Txt } from "@motion-canvas/2d";
import MyBox from "@/components/MyBox.vue";

export default makeScene(function* (view) {
  view.fill("#203128");

  const rectRef = createRef<Rect>();
  const boxRef = createVueRef(MyBox);
  const boxRef2 = createVueRef(MyBox);

  view.add(
    <Rect ref={rectRef} width={300} height={300} stroke="#87ff6f" lineWidth={2} opacity={1}>
      <Txt fill="#87ff6f">
        Motion Canvas <Txt fontFamily="monospace">&lt;Rect&gt;</Txt>
      </Txt>
    </Rect>,
  );
  view.add(
    mnVue(MyBox, boxRef, {
      label: "Vue Component",
      width: 800,
      height: 800,
      opacity: 1,
    }),
  );

  view.add(
    mnVue(MyBox, boxRef2, {
      label: "Another one",
      width: 800,
      height: 800,
      x: -300,
      opacity: 1,
    }),
  );

  yield* waitUntil("now!");

  yield* sequence(
    0.2,
    // rectRef().scale(1.5, 0.5, easeInSine),
    boxRef().opacity(0, 0.5),
    boxRef2().width(600, 3),
    boxRef2().height(300, 3),
    // boxRef2().scale(0, 0.5),
    // boxRef().scale(4.5, 0.5),
    // all(boxRef().width(1200, 0.5), boxRef().height(600, 0.5)),
  );

  yield* boxRef().opacity(1, 0.5);
  yield* boxRef().opacity(0, 0.5);

  yield* waitUntil("end");
});

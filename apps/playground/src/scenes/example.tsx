import { all, chain, createRef, easeInBack, waitFor } from "@motion-canvas/core";
import { mountVue, makeScene, createMnRef } from "@moliniani/core";
import { Rect } from "@motion-canvas/2d";
import MyBox from "../components/MyBox.vue";


export default makeScene(function* (view) {
  const boxRef = createMnRef(MyBox);
  yield mountVue(view, boxRef, { label: "Hello", opacity: 1 });

  view.fill("#707070");

  const rectRef = createRef<Rect>();
  view.add(
    <>
      <Rect
        ref={rectRef}
        x={50}
        y={50}
        width={300}
        height={300}
        stroke="black"
        lineWidth={2}
        opacity={1}
      />
    </>,
  );

  yield* waitFor(0.5);
  yield* chain(
    all(boxRef().opacity(0, 1)), rectRef().opacity(0, 0.35, easeInBack));
  yield* waitFor(0.5);
  yield* chain(
    all(boxRef().opacity(1, 0.35), boxRef().scale(1.8, 0.35)), rectRef().opacity(1, 0.35), boxRef().scale(1, 0.35));
});

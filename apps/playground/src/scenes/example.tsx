import { chain, createRef, easeInBack, waitFor } from "@motion-canvas/core";
import { mountVue, makeScene, createMnRef } from "@moliniani/core";
import { defineComponent, h } from "vue";
import { Rect } from "@motion-canvas/2d";

const Box = defineComponent({
  props: {
    opacity: Number,
    label: String,
  },
  setup(props) {
    return () =>
      h(
        "div",
        {
          id: "my-animatable-box",
          style: {
            width: "200px",
            height: "200px",
            background: "red",
            position: "absolute",
            top: "100px",
            left: "100px",
            boxShadow: "40px 30px 10px rgba(0,0,0,0.5)",
            opacity: props.opacity ?? 1,
          },
        },
        props.label,
      );
  },
});

export default makeScene(function* (view) {
  const boxRef = createMnRef(Box);
  yield mountVue(view, boxRef, { opacity: 1, label: "Hello" });

  view.fill("#f0f0f0");

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
  yield* chain(boxRef().opacity(0, 1), rectRef().opacity(0, 0.35, easeInBack));
  yield* waitFor(0.5);
  yield* chain(boxRef().opacity(1, 0.35), rectRef().opacity(1, 0.35));
});

import { waitFor } from "@motion-canvas/core";
import { mountVue, makeScene } from "@moliniani/core";
import { defineComponent, h } from "vue";

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
            opacity: props.opacity ?? 1,
          },
        },
        props.label,
      );
  },
});

export default makeScene(function* (view) {
  const box = yield mountVue(view, Box, { opacity: 1, label: "Hello" });

  yield* waitFor(0.5);
  yield* box.opacity(0, 1);
  yield* waitFor(0.5);
  yield* box.opacity(1, 2.5);
});

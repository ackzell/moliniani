import { createRef, easeInSine, sequence } from "@motion-canvas/core";
import { createVueRef, mnVue, makeScene } from "@moliniani/core";
import { Rect } from "@motion-canvas/2d";
import MyBox from "@/components/MyBox.vue";

export default makeScene(function* (view) {
  view.fill("#674545");

  const rectRef = createRef<Rect>();
  const boxRef = createVueRef(MyBox);

  view.add(
    <Rect
      ref={rectRef}
      x={50}
      y={50}
      width={300}
      height={300}
      stroke="black"
      lineWidth={2}
      opacity={1}
    />,
  );
  view.add(
    mnVue(MyBox, boxRef, {
      label: "Hello, Motion Canvas + Vue!",
      opacity: 0,
      x: -400,
      y: -200,
    }),
  );

  yield* sequence(0.2, rectRef().scale(1.5, 0.5, easeInSine), boxRef().opacity(1, 0.5));
});

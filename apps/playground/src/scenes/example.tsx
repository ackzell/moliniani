import { createRef, sequence, waitUntil } from "@motion-canvas/core";
import { createVueRef, mnVue, makeScene } from "@moliniani/core";
import { Layout, Rect, Txt } from "@motion-canvas/2d";
import MyBox from "@/components/MyBox.vue";

export default makeScene(function* (view) {
  view.fill("#203128");

  const rectRef = createRef<Rect>();
  const boxRef = createVueRef(MyBox);
  const boxRef2 = createVueRef(MyBox);

  view.add(
    <Layout layout gap={20} alignItems={"center"} justifyContent={"center"}>
      ,
      {mnVue(MyBox, boxRef, {
        label: "Vue Component",
        width: 500,
        height: 500,
        opacity: 1,
      })}
      <Rect
        layout
        alignItems={"center"}
        ref={rectRef}
        width={300}
        height={300}
        stroke="#87ff6f"
        lineWidth={2}
        opacity={1}
      >
        <Txt fill="#87ff6f">
          Motion Canvas <Txt fontFamily="monospace">&lt;Rect&gt;</Txt>
        </Txt>
      </Rect>
      {mnVue(MyBox, boxRef2, {
        label: "Another one",
        width: 500,
        height: 500,
        opacity: 1,
        background: "#00a6bc",
      })}
    </Layout>,
  );

  yield* waitUntil("now!");

  yield* sequence(
    0.2,
    // rectRef().scale(1.5, 0.5, easeInSine),
    boxRef().width(200, 0.5),
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

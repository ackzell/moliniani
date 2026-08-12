import { all, createRef, easeInOutSine, sequence, waitUntil } from "@motion-canvas/core";
import { createMnRef, makeScene, revealText } from "@moliniani/core";
import { TypewriterText } from "@moliniani/components";
import { Typewriter } from "@moliniani/components/vue";
import { floatIt } from "@moliniani/utils";
import { Layout, Rect, Txt } from "@motion-canvas/2d";
import MyBox from "@/components/MyBox.vue";

export default makeScene(function* (view) {
  view.fill("#203128");

  const rectRef = createRef<Rect>();
  const boxRef = createMnRef(MyBox);
  const boxRef2 = createMnRef(MyBox);

  const textRef = createRef<Txt>();
  const twRef = createRef<TypewriterText>();
  const vueTwRef = createMnRef(Typewriter);

  view.add(
    <>
      <Layout layout gap={20} alignItems={"center"} justifyContent={"center"}>
        <MyBox
          ref={boxRef}
          width={500}
          height={300}
          opacity={0}
          borderRadius={10}
          label="a Vue box :)"
        />
        <Rect
          layout
          direction={"column"}
          alignItems={"center"}
          justifyContent={"center"}
          ref={rectRef}
          width={300}
          height={300}
          stroke="#87ff6f"
          lineWidth={2}
          opacity={1}
        >
          <Txt ref={textRef} fill="#87ff6f" fontSize={40} lineHeight={70}>
            Motion Canvas
          </Txt>
          <Txt fill="#87ff6f" fontFamily="monospace">
            &lt;Rect&gt;
          </Txt>
        </Rect>
        <MyBox
          ref={boxRef2}
          label="Another one"
          width={500}
          height={500}
          opacity={1}
          backgroundColor="#00a6bc"
          textColor="rgba(255, 255, 255, 0.98)"
          borderRadius={10}
        />
      </Layout>
      <Typewriter ref={vueTwRef} text="" fontSize={36} color="#9fd6ff" y={-250} />
      ,
      <TypewriterText ref={twRef} text="" fontSize={36} fill="#ffd166" y={250} />,
    </>,
  );

  yield* waitUntil("now!");

  // Float the native typewriter for the rest of the scene.
  yield floatIt(boxRef2(), { amplitude: 15, period: 2 });

  yield* sequence(
    0.2,
    // rectRef().scale(1.5, 0.5, easeInSine),
    boxRef().opacity(1, 0.5),
    boxRef().width(200, 0.5),
    boxRef2().width(600, 3),
    all(
      boxRef2().height(300, 3),
      boxRef2().backgroundColor("#41998d", 3),
      boxRef2().textColor("hsl(0, 0%, 0%)", 3),
    ),
    rectRef().fill("#0088cc", 0.5),
    all(textRef().fill("#ffffff", 3.5), revealText(textRef(), 1.5)),
    all(twRef().type("Native TypewriterText", 1.5), vueTwRef().text("Vue <Typewriter>", 1.5)),
    boxRef2().label("Changed props!", 0.5),
    // boxRef2().scale(0, 0.5),
    // boxRef().scale(4.5, 0.5),
    // all(boxRef().width(1200, 0.5), boxRef().height(600, 0.5)),
  );

  yield* sequence(
    0.5,
    boxRef2().borderRadius(30, 1, easeInOutSine),
    boxRef2().opacity(0, 0.5),
    rectRef().opacity(0, 0.5),
    boxRef().opacity(0, 0.5),
    twRef().opacity(0, 0.5),
    vueTwRef().opacity(0, 0.5),
  );

  yield* waitUntil("end");
});

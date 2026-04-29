import { makeScene2D } from "@motion-canvas/2d";
import { useScene, waitFor, ThreadGenerator, all } from "@motion-canvas/core";

export default makeScene2D(function* (view) {
  const tg: ThreadGenerator = all(waitFor(1));

  console.log(tg);

  view.add(<></>);

  const scene = useScene();
  console.log(Object.keys(scene.playback));

  yield* waitFor(1);
  console.log("Done");
});

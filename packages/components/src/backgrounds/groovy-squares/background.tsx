import { Rect, View2D } from "@motion-canvas/2d";
import { Color, createSignal, spawn } from "@motion-canvas/core";
import shader from "./shader.glsl";

export function addGroovyBackground(view: View2D) {
  const time = createSignal(0);

  view.add(
    <Rect
      width={1920}
      height={1080}
      zIndex={-100}
      shaders={{
        fragment: shader,
        uniforms: {
          _Color0: new Color("#02020266"),
          _Color1: new Color("#5c5c5c66"),
          _Number: 7.6,
          _Random: 16,
          _Time: () => time() * 1.4,
        },
      }}
    />,
  );

  spawn(time(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY));
}

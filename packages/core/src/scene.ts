// packages/core/src/scene.ts
import { makeScene2D } from "@motion-canvas/2d";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { View2D } from "@motion-canvas/2d";

export function makeScene(runner: (view: View2D) => ThreadGenerator) {
  return makeScene2D(function* (view: View2D) {
    yield* runner(view);
  });
}

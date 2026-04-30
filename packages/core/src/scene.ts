// packages/core/src/scene.ts
import { makeScene2D } from "@motion-canvas/2d";
import { spawn } from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { View2D } from "@motion-canvas/2d";
import { runGSAPTicker } from "./ticker";

export function makeScene(runner: (view: View2D) => ThreadGenerator) {
  return makeScene2D(function* (view: View2D) {
    spawn(runGSAPTicker());
    yield* runner(view);
  });
}

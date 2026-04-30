// packages/core/src/ticker.ts
import gsap from "gsap";
import { useThread, decorate, threadable } from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";

let initialized = false;

decorate(runGSAPTicker, threadable());
export function* runGSAPTicker(): ThreadGenerator {
  if (!initialized) {
    gsap.ticker.remove(gsap.updateRoot);
    initialized = true;
  }

  const thread = useThread();

  while (true) {
    gsap.updateRoot(thread.time());
    yield;
  }
}

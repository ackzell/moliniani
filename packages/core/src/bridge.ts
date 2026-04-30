// packages/core/src/bridge.ts
import gsap from "gsap";
import { decorate, threadable } from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";

export function makeAnimatable(state: Record<string, any>, key: string) {
  const fn = function* (to: number, duration = 0, ease = "power2.inOut"): ThreadGenerator {
    let done = false;

    gsap.to(state, {
      [key]: to,
      duration,
      ease,
      onComplete: () => {
        done = true;
      },
      onUpdate: () => console.log("gsap update:", key, state[key]),
    });

    while (!done) {
      yield;
    }
  };

  decorate(fn, threadable());
  return fn;
}

// packages/core/src/bridge.ts
import gsap from "gsap";
import { decorate, threadable } from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";

export function makeAnimatable(target: Record<string, any> | HTMLElement, key: string) {
  const fn = function* (to: number, duration = 0, ease = "power2.inOut"): ThreadGenerator {
    let done = false;

    gsap.to(target, {
      [key]: to,
      duration,
      ease,
      onComplete: () => {
        done = true;
      },
    });

    while (!done) {
      yield;
    }
  };

  decorate(fn, threadable());
  return fn;
}

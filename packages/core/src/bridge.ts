import { decorate, threadable, useThread } from "@motion-canvas/core";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { Ref } from "vue";

decorate(tweenRef, threadable());
export function* tweenRef(
  ref: Ref<number>,
  from: number,
  to: number,
  seconds: number,
): ThreadGenerator {
  const thread = useThread();
  const startTime = thread.time();
  const endTime = thread.time() + seconds;

  ref.value = from;

  while (endTime > thread.fixed) {
    const progress = (thread.fixed - startTime) / seconds;
    ref.value = from + (to - from) * progress;
    yield;
  }

  ref.value = to;
}

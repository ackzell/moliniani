import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { ref } from "vue";
import { PlaybackManager, PlaybackStatus } from "@motion-canvas/core";
import { threads } from "@motion-canvas/core";
import { endPlayback, startPlayback } from "@motion-canvas/core";
import { tweenRef } from "../src/bridge";

describe("tweenRef()", () => {
  const playback = new PlaybackManager();
  const status = new PlaybackStatus(playback);

  beforeAll(() => startPlayback(status));
  afterAll(() => endPlayback(status));

  test("animates a ref from one value to another", () => {
    const opacity = ref(0);

    const task = threads(function* () {
      yield* tweenRef(opacity, 0, 1, 1);
    });

    playback.fps = 60;
    playback.frame = 0;

    for (const _ of task) {
      playback.frame++;
    }

    expect(opacity.value).toBe(1);
  });

  test("is framerate independent", () => {
    const value60 = ref(0);
    const value24 = ref(0);

    const task60 = threads(function* () {
      yield* tweenRef(value60, 0, 100, 1);
    });

    const task24 = threads(function* () {
      yield* tweenRef(value24, 0, 100, 1);
    });

    playback.fps = 60;
    playback.frame = 0;
    for (const _ of task60) playback.frame++;

    playback.fps = 24;
    playback.frame = 0;
    for (const _ of task24) playback.frame++;

    expect(value60.value).toBeCloseTo(value24.value);
    expect(value60.value).toBeCloseTo(100);
  });
});

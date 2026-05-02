import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { PlaybackManager, PlaybackStatus, threads, spawn } from "@motion-canvas/core";
import { endPlayback, startPlayback } from "@motion-canvas/core";
import { makeAnimatable } from "../src/bridge";
import { runGSAPTicker } from "../src/ticker";

describe("makeAnimatable()", () => {
  const playback = new PlaybackManager();
  const status = new PlaybackStatus(playback);

  beforeAll(() => startPlayback(status));
  afterAll(() => endPlayback(status));

  test("animates a property to the target value", () => {
    const target = { opacity: 0 };
    const animate = makeAnimatable(target, "opacity");

    const task = threads(function* () {
      spawn(runGSAPTicker());
      yield* animate(1, 1);
    });

    playback.fps = 60;
    playback.frame = 0;
    for (const _ of task) {
      playback.frame++;
    }

    expect(target.opacity).toBeCloseTo(1);
  });

  test("is framerate independent", () => {
    const target60 = { value: 0 };
    const target24 = { value: 0 };

    const animate60 = makeAnimatable(target60, "value");
    const animate24 = makeAnimatable(target24, "value");

    const task60 = threads(function* () {
      spawn(runGSAPTicker());
      yield* animate60(100, 1);
    });

    const task24 = threads(function* () {
      spawn(runGSAPTicker());
      yield* animate24(100, 1);
    });

    playback.fps = 60;
    playback.frame = 0;
    for (const _ of task60) playback.frame++;

    playback.fps = 24;
    playback.frame = 0;
    for (const _ of task24) playback.frame++;

    expect(target60.value).toBeCloseTo(target24.value);
    expect(target60.value).toBeCloseTo(100);
  });
});

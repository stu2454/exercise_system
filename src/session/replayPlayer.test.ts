import { describe, expect, it } from "vitest";
import type { ReplayScheduler } from "./replayPlayer";
import { ReplayPlayer } from "./replayPlayer";
import type { ReplayRecording } from "./replayRecording";

function recording(): ReplayRecording {
  return {
    metadata: {} as ReplayRecording["metadata"],
    observations: [
      { type: "pose-observation", timestampMs: 100, pose: null },
      { type: "pose-observation", timestampMs: 200, pose: null },
    ],
    diagnostics: {
      poseQualityByTimestamp: new Map(),
      movementFeaturesByTimestamp: new Map(),
    },
    durationMs: 100,
  };
}

function fakeScheduler() {
  let nowMs = 0;
  let nextId = 0;
  const tasks = new Map<number, { callback: () => void; delayMs: number }>();
  const scheduler: ReplayScheduler = {
    now: () => nowMs,
    schedule: (callback, delayMs) => {
      const id = ++nextId;
      tasks.set(id, { callback, delayMs });
      return id;
    },
    cancel: (handle) => tasks.delete(handle as number),
  };
  return {
    scheduler,
    runNext: () => {
      const entry = tasks.entries().next().value as
        | [number, { callback: () => void; delayMs: number }]
        | undefined;
      if (!entry) return;
      tasks.delete(entry[0]);
      nowMs += entry[1].delayMs;
      entry[1].callback();
    },
    taskCount: () => tasks.size,
  };
}

describe("ReplayPlayer", () => {
  it("supports start, pause, and restart with processing reset", () => {
    const fake = fakeScheduler();
    const outputs: number[] = [];
    const player = new ReplayPlayer(
      recording(),
      {
        onOutput: (output) => outputs.push(output.timestampMs),
        onStateChange: () => undefined,
      },
      fake.scheduler,
    );

    player.play();
    expect(outputs).toEqual([100]);
    expect(player.getState().status).toBe("playing");
    player.pause();
    expect(player.getState().status).toBe("paused");
    expect(fake.taskCount()).toBe(0);
    player.restart();
    expect(player.getState()).toMatchObject({
      status: "ready",
      processedObservations: 0,
      elapsedMs: 0,
    });
    player.play();
    expect(outputs).toEqual([100, 100]);
    fake.runNext();
    expect(player.getState()).toMatchObject({
      status: "completed",
      processedObservations: 2,
      progress: 1,
    });
  });
});

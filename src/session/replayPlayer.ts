import type { ReplayOutput, DeterminismSummary } from "./replayProcessor";
import { ReplayProcessor } from "./replayProcessor";
import type { ReplayRecording } from "./replayRecording";

export type ReplayStatus = "ready" | "playing" | "paused" | "completed" | "stopped";

export interface ReplayState {
  status: ReplayStatus;
  elapsedMs: number;
  totalDurationMs: number;
  progress: number;
  processedObservations: number;
  totalObservations: number;
  summary: DeterminismSummary | null;
}

export interface ReplayScheduler {
  now: () => number;
  schedule: (callback: () => void, delayMs: number) => unknown;
  cancel: (handle: unknown) => void;
}

const defaultScheduler: ReplayScheduler = {
  now: () => performance.now(),
  schedule: (callback, delayMs) => window.setTimeout(callback, delayMs),
  cancel: (handle) => window.clearTimeout(handle as number),
};

interface ReplayPlayerCallbacks {
  onOutput: (output: ReplayOutput) => void;
  onStateChange: (state: ReplayState) => void;
}

export class ReplayPlayer {
  private readonly processor: ReplayProcessor;
  private index = 0;
  private timerHandle: unknown = null;
  private dueAtMs = 0;
  private remainingDelayMs = 0;
  private state: ReplayState;

  constructor(
    private readonly recording: ReplayRecording,
    private readonly callbacks: ReplayPlayerCallbacks,
    private readonly scheduler: ReplayScheduler = defaultScheduler,
  ) {
    this.processor = new ReplayProcessor(recording.diagnostics);
    this.state = this.makeState("ready");
    this.emitState();
  }

  play(): void {
    if (this.state.status === "playing") return;

    if (this.state.status === "paused") {
      this.state = this.makeState("playing");
      this.emitState();
      this.scheduleNext(this.remainingDelayMs);
      return;
    }

    this.resetProcessing();
    this.state = this.makeState("playing");
    this.emitState();
    this.processCurrent();
  }

  pause(): void {
    if (this.state.status !== "playing") return;
    if (this.timerHandle !== null) {
      this.scheduler.cancel(this.timerHandle);
      this.timerHandle = null;
      this.remainingDelayMs = Math.max(0, this.dueAtMs - this.scheduler.now());
    }
    this.state = this.makeState("paused");
    this.emitState();
  }

  restart(): void {
    this.cancelTimer();
    this.resetProcessing();
    this.state = this.makeState("ready");
    this.emitState();
  }

  stop(): void {
    this.cancelTimer();
    this.resetProcessing();
    this.state = this.makeState("stopped");
    this.emitState();
  }

  dispose(): void {
    this.cancelTimer();
    this.processor.reset();
  }

  getState(): ReplayState {
    return { ...this.state };
  }

  private processCurrent(): void {
    if (this.state.status !== "playing") return;
    const observation = this.recording.observations[this.index];
    this.callbacks.onOutput(this.processor.process(observation));
    this.index += 1;

    if (this.index >= this.recording.observations.length) {
      this.state = this.makeState("completed", this.processor.getSummary());
      this.emitState();
      return;
    }

    this.state = this.makeState("playing");
    this.emitState();
    const next = this.recording.observations[this.index];
    this.scheduleNext(Math.max(0, next.timestampMs - observation.timestampMs));
  }

  private scheduleNext(delayMs: number): void {
    this.remainingDelayMs = delayMs;
    this.dueAtMs = this.scheduler.now() + delayMs;
    this.timerHandle = this.scheduler.schedule(() => {
      this.timerHandle = null;
      this.remainingDelayMs = 0;
      this.processCurrent();
    }, delayMs);
  }

  private cancelTimer(): void {
    if (this.timerHandle !== null) {
      this.scheduler.cancel(this.timerHandle);
      this.timerHandle = null;
    }
    this.remainingDelayMs = 0;
  }

  private resetProcessing(): void {
    this.processor.reset();
    this.index = 0;
    this.remainingDelayMs = 0;
  }

  private makeState(
    status: ReplayStatus,
    summary: DeterminismSummary | null = null,
  ): ReplayState {
    const firstTimestampMs = this.recording.observations[0].timestampMs;
    const processedTimestampMs =
      this.index > 0
        ? this.recording.observations[this.index - 1].timestampMs
        : firstTimestampMs;
    return {
      status,
      elapsedMs: this.index > 0 ? processedTimestampMs - firstTimestampMs : 0,
      totalDurationMs: this.recording.durationMs,
      progress:
        this.recording.durationMs > 0
          ? (processedTimestampMs - firstTimestampMs) /
            this.recording.durationMs
          : this.index >= this.recording.observations.length
            ? 1
            : 0,
      processedObservations: this.index,
      totalObservations: this.recording.observations.length,
      summary,
    };
  }

  private emitState(): void {
    this.callbacks.onStateChange({ ...this.state });
  }
}

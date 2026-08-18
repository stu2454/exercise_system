import type { PoseQuality } from "../pose/types";
import type { ProgrammeRunnerState } from "../programme/programmeRunner";

export type SessionStatus = "completed" | "aborted";
export type SessionEndedReason = "completed" | "participant_exit" | "developer_exit" | "error";

export interface ExerciseIntervalRecord {
  setIndex: number;
  exerciseIndex: number;
  exerciseId: string;
  elapsedExerciseTimeSeconds: number;
  timestampMs: number;
  validObservationFraction: number | null;
  partial: boolean;
}

export interface ProgrammeSessionResult {
  status: SessionStatus;
  endedReason: SessionEndedReason;
  endedAtTimestampMs: number;
  intervals: ExerciseIntervalRecord[];
}

export class ProgrammeSessionTracker {
  private intervals: ExerciseIntervalRecord[] = [];
  private active: { setIndex: number; exerciseIndex: number; exerciseId: string; durationSeconds: number; elapsedSeconds: number; observations: number; valid: number } | null = null;

  transition(previous: ProgrammeRunnerState, next: ProgrammeRunnerState, exerciseId: string | null, durationSeconds: number, timestampMs: number): void {
    if (this.active && previous.phase === "exercising") this.active.elapsedSeconds = Math.max(this.active.elapsedSeconds, this.active.durationSeconds - previous.exerciseTimeRemainingSeconds);
    if (this.active && previous.phase === "exercising" && next.phase !== "exercising") this.active.elapsedSeconds = this.active.durationSeconds;
    if (previous.phase === "exercising" && (next.phase !== "exercising" || previous.currentSetIndex !== next.currentSetIndex || previous.currentExerciseIndex !== next.currentExerciseIndex)) this.commit(timestampMs, false);
    if (next.phase === "exercising" && (previous.phase !== "exercising" || previous.currentSetIndex !== next.currentSetIndex || previous.currentExerciseIndex !== next.currentExerciseIndex) && exerciseId) {
      this.active = { setIndex: next.currentSetIndex, exerciseIndex: next.currentExerciseIndex, exerciseId, durationSeconds, elapsedSeconds: Math.max(0, durationSeconds - next.exerciseTimeRemainingSeconds), observations: 0, valid: 0 };
    }
    if (this.active && next.phase === "exercising") this.active.elapsedSeconds = Math.max(this.active.elapsedSeconds, this.active.durationSeconds - next.exerciseTimeRemainingSeconds);
  }

  observe(quality: PoseQuality): void { if (this.active) { this.active.observations += 1; if (quality.level !== "insufficient") this.active.valid += 1; } }

  finish(status: SessionStatus, endedReason: SessionEndedReason, timestampMs: number): ProgrammeSessionResult {
    if (this.active) this.commit(timestampMs, true);
    return { status, endedReason, endedAtTimestampMs: timestampMs, intervals: this.intervals.map((item) => ({ ...item })) };
  }

  private commit(timestampMs: number, partial: boolean): void {
    if (!this.active) return;
    const elapsed = Math.min(this.active.durationSeconds, this.active.elapsedSeconds);
    this.intervals.push({ setIndex: this.active.setIndex, exerciseIndex: this.active.exerciseIndex, exerciseId: this.active.exerciseId, elapsedExerciseTimeSeconds: elapsed, timestampMs, validObservationFraction: this.active.observations ? this.active.valid / this.active.observations : null, partial });
    this.active = null;
  }
}

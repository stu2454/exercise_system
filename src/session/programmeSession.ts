import type { ExercisePrescription, ExerciseProgramme } from "../exercise/types";
import type { PoseQuality } from "../pose/types";
import type { ProgrammeRunnerState } from "../programme/programmeRunner";

export type SessionStatus = "completed" | "aborted";
export type SessionEndedReason = "completed" | "participant_exit" | "developer_exit" | "error";

export interface ExerciseIntervalRecord {
  setIndex: number; exerciseIndex: number; exerciseId: string;
  elapsedExerciseTimeSeconds: number; completedRepetitions: number;
  timestampMs: number; validObservationFraction: number | null; partial: boolean;
}

export interface ProgrammeSessionSetResult {
  setIndex: number; targetRepetitions?: number; completedRepetitions?: number;
  targetDurationSeconds?: number; completedDurationSeconds?: number; completed: boolean;
}

export interface ProgrammeSessionExerciseResult {
  exerciseId: string; prescribed: ExercisePrescription; sets: ProgrammeSessionSetResult[];
}

export interface ProgrammeSessionResult {
  sessionId: string; programmeId: string; programmeNameSnapshot: string;
  startedAtTimestampMs: number; completedAtTimestampMs?: number;
  status: SessionStatus; endedReason: SessionEndedReason; endedAtTimestampMs: number;
  exercises: ProgrammeSessionExerciseResult[];
  /** Retained as a compact diagnostic timeline for recording exports. */
  intervals: ExerciseIntervalRecord[];
}

export function createSessionId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

interface ActiveInterval {
  setIndex: number; exerciseIndex: number; exerciseId: string;
  targetDurationSeconds: number; targetRepetitions: number;
  elapsedSeconds: number; completedRepetitions: number; observations: number; valid: number;
}

function clonePrescription(prescription: ExercisePrescription): ExercisePrescription {
  return { ...prescription, dose: { ...prescription.dose } };
}

export class ProgrammeSessionTracker {
  private intervals: ExerciseIntervalRecord[] = [];
  private active: ActiveInterval | null = null;
  private finalResult: ProgrammeSessionResult | null = null;

  constructor(
    private readonly programme: ExerciseProgramme,
    private readonly startedAtTimestampMs: number,
    private readonly sessionId = createSessionId(),
  ) {}

  transition(previous: ProgrammeRunnerState, next: ProgrammeRunnerState, timestampMs: number): void {
    if (this.finalResult) return;
    if (this.active && previous.phase === "exercising") {
      this.active.elapsedSeconds = Math.max(this.active.elapsedSeconds, this.active.targetDurationSeconds - previous.exerciseTimeRemainingSeconds);
      this.active.completedRepetitions = Math.max(this.active.completedRepetitions, previous.completedRepetitions, next.completedRepetitions);
    }
    const leftExercise = previous.phase === "exercising" && (next.phase !== "exercising" || previous.currentSetIndex !== next.currentSetIndex || previous.currentExerciseIndex !== next.currentExerciseIndex);
    if (leftExercise) {
      const naturallyCompleted = next.transitionCause === "exercise-completed";
      if (naturallyCompleted && this.active?.targetDurationSeconds) this.active.elapsedSeconds = this.active.targetDurationSeconds;
      if (naturallyCompleted && this.active?.targetRepetitions) this.active.completedRepetitions = this.active.targetRepetitions;
      this.commit(timestampMs, !naturallyCompleted);
    }
    const enteredExercise = next.phase === "exercising" && (previous.phase !== "exercising" || previous.currentSetIndex !== next.currentSetIndex || previous.currentExerciseIndex !== next.currentExerciseIndex);
    if (enteredExercise) {
      const prescription = this.programme.exercises[next.currentExerciseIndex];
      if (!prescription) return;
      const targetDurationSeconds = prescription.dose.durationSeconds ?? 0;
      this.active = {
        setIndex: next.currentSetIndex, exerciseIndex: next.currentExerciseIndex, exerciseId: prescription.exerciseId,
        targetDurationSeconds, targetRepetitions: prescription.dose.repetitions ?? 0,
        elapsedSeconds: Math.max(0, targetDurationSeconds - next.exerciseTimeRemainingSeconds),
        completedRepetitions: next.completedRepetitions, observations: 0, valid: 0,
      };
    }
    if (this.active && next.phase === "exercising") {
      this.active.elapsedSeconds = Math.max(this.active.elapsedSeconds, this.active.targetDurationSeconds - next.exerciseTimeRemainingSeconds);
      this.active.completedRepetitions = Math.max(this.active.completedRepetitions, next.completedRepetitions);
    }
  }

  observe(quality: PoseQuality): void {
    if (this.active) { this.active.observations += 1; if (quality.level !== "insufficient") this.active.valid += 1; }
  }

  finish(status: SessionStatus, endedReason: SessionEndedReason, timestampMs: number): ProgrammeSessionResult {
    if (this.finalResult) return this.finalResult;
    if (this.active) this.commit(timestampMs, true);
    const intervals = this.intervals.map((item) => ({ ...item }));
    this.finalResult = {
      sessionId: this.sessionId, programmeId: this.programme.id,
      programmeNameSnapshot: this.programme.name,
      startedAtTimestampMs: this.startedAtTimestampMs,
      completedAtTimestampMs: status === "completed" ? timestampMs : undefined,
      status, endedReason, endedAtTimestampMs: timestampMs,
      exercises: this.programme.exercises.map((prescription, exerciseIndex) => ({
        exerciseId: prescription.exerciseId,
        prescribed: clonePrescription(prescription),
        sets: Array.from({ length: prescription.sets ?? 1 }, (_, setIndex) => {
          const interval = intervals.find((item) => item.exerciseIndex === exerciseIndex && item.setIndex === setIndex);
          return {
            setIndex, targetRepetitions: prescription.dose.repetitions,
            completedRepetitions: prescription.dose.repetitions === undefined ? undefined : interval?.completedRepetitions ?? 0,
            targetDurationSeconds: prescription.dose.durationSeconds,
            completedDurationSeconds: prescription.dose.durationSeconds === undefined ? undefined : interval?.elapsedExerciseTimeSeconds ?? 0,
            completed: interval ? !interval.partial : false,
          };
        }),
      })),
      intervals,
    };
    return this.finalResult;
  }

  private commit(timestampMs: number, partial: boolean): void {
    if (!this.active) return;
    this.intervals.push({
      setIndex: this.active.setIndex, exerciseIndex: this.active.exerciseIndex, exerciseId: this.active.exerciseId,
      elapsedExerciseTimeSeconds: Math.min(this.active.targetDurationSeconds, this.active.elapsedSeconds),
      completedRepetitions: Math.min(this.active.targetRepetitions, this.active.completedRepetitions),
      timestampMs, validObservationFraction: this.active.observations ? this.active.valid / this.active.observations : null, partial,
    });
    this.active = null;
  }
}

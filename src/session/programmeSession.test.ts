import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME } from "../exercise/exerciseLibrary";
import type { ExerciseProgramme } from "../exercise/types";
import { createProgrammeRunnerState, processProgrammeRunnerEvent, startCurrentExercise, startProgramme, tickProgramme } from "../programme/programmeRunner";
import { ProgrammeSessionTracker } from "./programmeSession";

function started(programme = DEVELOPMENT_PROGRAMME) {
  const ready = startProgramme(createProgrammeRunnerState(programme), programme);
  return { ready, active: startCurrentExercise(ready, programme) };
}

describe("programme session retention and summary", () => {
  it("retains a partial duration exercise when aborted", () => {
    const tracker = new ProgrammeSessionTracker(DEVELOPMENT_PROGRAMME, 1000, "session-a");
    const { ready, active } = started();
    const progressed = tickProgramme(active, DEVELOPMENT_PROGRAMME, 15);
    tracker.transition(ready, active, 1000); tracker.transition(active, progressed, 16000);
    const result = tracker.finish("aborted", "participant_exit", 16000);
    expect(result).toMatchObject({ sessionId: "session-a", programmeId: "programme-a", programmeNameSnapshot: "Programme A", startedAtTimestampMs: 1000, status: "aborted", endedReason: "participant_exit" });
    expect(result.intervals[0]).toMatchObject({ exerciseId: "exercise-01", elapsedExerciseTimeSeconds: 15, partial: true });
    expect(result.exercises[0].sets[0]).toMatchObject({ targetDurationSeconds: 60, completedDurationSeconds: 15, completed: false });
  });

  it("records prescribed and completed duration sets", () => {
    const tracker = new ProgrammeSessionTracker(DEVELOPMENT_PROGRAMME, 0);
    const { ready, active } = started(); const rest = tickProgramme(active, DEVELOPMENT_PROGRAMME, 60);
    tracker.transition(ready, active, 0); tracker.transition(active, rest, 60000);
    const result = tracker.finish("aborted", "participant_exit", 61000);
    expect(result.intervals[0]).toMatchObject({ partial: false, elapsedExerciseTimeSeconds: 60 });
    expect(result.exercises[0]).toMatchObject({ exerciseId: "exercise-01", prescribed: { dose: { durationSeconds: 60 }, sets: 3 } });
    expect(result.exercises[0].sets.map((set) => set.completed)).toEqual([true, false, false]);
  });

  it("records repetition targets and completed repetitions", () => {
    const programme: ExerciseProgramme = { ...DEVELOPMENT_PROGRAMME, exercises: DEVELOPMENT_PROGRAMME.exercises.map((item, index) => index === 0 ? { ...item, doseType: "repetitions", dose: { repetitions: 2 } } : item) };
    const tracker = new ProgrammeSessionTracker(programme, 0); const { ready, active } = started(programme);
    const once = processProgrammeRunnerEvent(active, programme, { type: "repetition-completed", exerciseId: "exercise-01", timestampMs: 10, source: "developer" });
    const complete = processProgrammeRunnerEvent(once, programme, { type: "repetition-completed", exerciseId: "exercise-01", timestampMs: 20, source: "developer" });
    tracker.transition(ready, active, 0); tracker.transition(active, once, 10); tracker.transition(once, complete, 20);
    expect(tracker.finish("aborted", "participant_exit", 30).exercises[0].sets[0]).toMatchObject({ targetRepetitions: 2, completedRepetitions: 2, completed: true });
  });

  it("marks skipped exercises partial rather than completed", () => {
    const tracker = new ProgrammeSessionTracker(DEVELOPMENT_PROGRAMME, 0); const { ready, active } = started();
    tracker.transition(ready, active, 0); tracker.transition(active, { ...active, phase: "ready", currentExerciseIndex: 1 }, 1000);
    expect(tracker.finish("aborted", "developer_exit", 1000).exercises[0].sets[0].completed).toBe(false);
  });

  it("records zero-rest completion before advancing directly", () => {
    const programme = { ...DEVELOPMENT_PROGRAMME, exercises: DEVELOPMENT_PROGRAMME.exercises.map((item) => ({ ...item, restBetweenSetsSeconds: 0 })) };
    const tracker = new ProgrammeSessionTracker(programme, 0); const { ready, active } = started(programme);
    const nextReady = tickProgramme(active, programme, 60);
    tracker.transition(ready, active, 0); tracker.transition(active, nextReady, 60000);
    expect(tracker.finish("aborted", "participant_exit", 60001).exercises[0].sets[0].completed).toBe(true);
  });

  it("marks normal termination completed and finish is idempotent", () => {
    const tracker = new ProgrammeSessionTracker(DEVELOPMENT_PROGRAMME, 10); const first = tracker.finish("completed", "completed", 100);
    expect(first).toMatchObject({ status: "completed", endedReason: "completed", completedAtTimestampMs: 100 });
    expect(tracker.finish("aborted", "error", 200)).toBe(first);
  });
});

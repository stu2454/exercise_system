import { describe, expect, it } from "vitest";
import { createProgrammeRunnerState, startCurrentExercise, startProgramme, tickProgramme } from "../programme/programmeRunner";
import { DEVELOPMENT_PROGRAMME } from "../exercise/exerciseLibrary";
import { ProgrammeSessionTracker } from "./programmeSession";

describe("programme session retention", () => {
  it("retains a partial exercise when aborted", () => { const t = new ProgrammeSessionTracker(); const idle = createProgrammeRunnerState(DEVELOPMENT_PROGRAMME); const ready = startProgramme(idle, DEVELOPMENT_PROGRAMME); const active = startCurrentExercise(ready, DEVELOPMENT_PROGRAMME); const progressed = tickProgramme(active, DEVELOPMENT_PROGRAMME, 15); t.transition(ready, active, "exercise-01", 60, 1000); t.transition(active, progressed, "exercise-01", 60, 16000); const result = t.finish("aborted", "participant_exit", 16000); expect(result).toMatchObject({ status: "aborted", endedReason: "participant_exit" }); expect(result.intervals[0]).toMatchObject({ exerciseId: "exercise-01", elapsedExerciseTimeSeconds: 15, partial: true }); });
  it("commits completed previous exercises incrementally", () => { const t = new ProgrammeSessionTracker(); const ready = startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME); const active = startCurrentExercise(ready, DEVELOPMENT_PROGRAMME); const rest = tickProgramme(active, DEVELOPMENT_PROGRAMME, 60); t.transition(ready, active, "exercise-01", 60, 0); t.transition(active, rest, "exercise-01", 60, 60000); expect(t.finish("aborted", "participant_exit", 61000).intervals[0]).toMatchObject({ partial: false, elapsedExerciseTimeSeconds: 60 }); });
  it("marks normal programme termination completed", () => { expect(new ProgrammeSessionTracker().finish("completed", "completed", 100)).toMatchObject({ status: "completed", endedReason: "completed" }); });
});

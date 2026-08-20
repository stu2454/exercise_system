import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME } from "../exercise/exerciseLibrary";
import {
  createProgrammeRunnerState,
  programmeExerciseOrder,
  startCurrentExercise,
  startProgramme,
  tickProgramme,
} from "../programme/programmeRunner";
import { createClientDemoProgramme } from "./clientDemoProgramme";
import { ProgrammeSessionTracker } from "../session/programmeSession";

describe("Client Demo programme", () => {
  const demo = createClientDemoProgramme(DEVELOPMENT_PROGRAMME);

  it("executes all nine configured exercises once in their original order", () => {
    expect(programmeExerciseOrder(demo)).toEqual(
      DEVELOPMENT_PROGRAMME.exercises.map(({ exerciseId }) => exerciseId),
    );
    expect(programmeExerciseOrder(demo)).toHaveLength(9);
    expect(new Set(programmeExerciseOrder(demo))).toHaveLength(9);
  });

  it("preserves exercise dose and rest configuration while overriding only sets", () => {
    demo.exercises.forEach((prescription, index) => {
      expect(prescription.dose).toEqual(DEVELOPMENT_PROGRAMME.exercises[index].dose);
      expect(prescription.restBetweenSetsSeconds).toBe(20);
      expect(prescription.sets).toBe(1);
    });
  });

  it("moves from Exercise 1 to Exercise 2 and completes after Exercise 9", () => {
    let state = startCurrentExercise(
      startProgramme(createProgrammeRunnerState(demo), demo),
      demo,
    );
    state = tickProgramme(state, demo, demo.exercises[0].dose.durationSeconds!);
    expect(state).toMatchObject({ phase: "resting", currentExerciseIndex: 0, restTimeRemainingSeconds: 20 });
    state = tickProgramme(state, demo, 20);
    expect(state).toMatchObject({ phase: "exercising", currentExerciseIndex: 1, currentSetIndex: 0 });

    state = {
      ...state,
      currentExerciseIndex: 8,
      exerciseTimeRemainingSeconds: demo.exercises[8].dose.durationSeconds!,
    };
    expect(tickProgramme(state, demo, demo.exercises[8].dose.durationSeconds!)).toMatchObject({
      phase: "programme-complete",
      currentSetIndex: 0,
      currentExerciseIndex: 8,
    });
  });

  it("does not change the source programme's multi-round capability", () => {
    expect(programmeExerciseOrder(DEVELOPMENT_PROGRAMME)).toHaveLength(27);
    expect(DEVELOPMENT_PROGRAMME.exercises.every(({ sets }) => sets === 3)).toBe(true);
  });

  it("keeps onboarding movements outside the programme result schema", () => {
    const result = new ProgrammeSessionTracker(demo, 1000, "demo-session").finish("aborted", "participant_exit", 2000);
    expect(result.exercises).toHaveLength(9);
    expect(result.exercises.map(({ exerciseId }) => exerciseId)).toEqual(programmeExerciseOrder(demo));
    expect(result.exercises.some(({ exerciseId }) => exerciseId.includes("tutorial"))).toBe(false);
  });
});

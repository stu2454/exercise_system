import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import type { ExerciseProgramme } from "../exercise/types";
import {
  createProgrammeRunnerState,
  currentRunnerExercise,
  pauseProgramme,
  programmeExerciseOrder,
  resumeProgramme,
  restoreProgrammeAfterExit,
  startCurrentExercise,
  startProgramme,
  tickProgramme,
  suspendProgrammeForExit,
  validateRunnerProgramme,
  type ProgrammeRunnerState,
} from "./programmeRunner";

function programmeWithSets(sets: 2 | 3): ExerciseProgramme {
  return {
    ...DEVELOPMENT_PROGRAMME,
    exercises: DEVELOPMENT_PROGRAMME.exercises.map((prescription) => ({
      ...prescription,
      sets,
    })),
  };
}

function exercisingState(
  programme: ExerciseProgramme,
  setIndex: number,
  exerciseIndex: number,
): ProgrammeRunnerState {
  return {
    ...createProgrammeRunnerState(programme),
    phase: "exercising",
    currentSetIndex: setIndex,
    currentExerciseIndex: exerciseIndex,
    exerciseTimeRemainingSeconds: 60,
  };
}

function runOrder(programme: ExerciseProgramme): string[] {
  let state = startCurrentExercise(startProgramme(createProgrammeRunnerState(programme), programme), programme);
  const order: string[] = [];
  while (state.phase !== "programme-complete") {
    if (state.phase === "exercising") {
      order.push(programme.exercises[state.currentExerciseIndex].exerciseId);
      state = tickProgramme(state, programme, 60);
    } else {
      state = tickProgramme(state, programme, 20);
    }
  }
  return order;
}

describe("participant programme state machine", () => {
  it("starts at set 1, exercise 1 in READY", () => {
    const state = startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME);
    expect(state).toMatchObject({ phase: "ready", currentSetIndex: 0, currentExerciseIndex: 0 });
  });

  it("manual Start begins the first 60-second exercise", () => {
    const ready = startProgramme(createProgrammeRunnerState(DEVELOPMENT_PROGRAMME), DEVELOPMENT_PROGRAMME);
    expect(startCurrentExercise(ready, DEVELOPMENT_PROGRAMME)).toMatchObject({
      phase: "exercising",
      exerciseTimeRemainingSeconds: 60,
    });
  });

  it("a 60-second exercise transitions to rest", () => {
    const state = tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 0, 0), DEVELOPMENT_PROGRAMME, 60);
    expect(state).toMatchObject({ phase: "resting", currentExerciseIndex: 0, restTimeRemainingSeconds: 20 });
  });

  it("rest timeout and Continue Now advance to the next exercise", () => {
    const resting = tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 0, 0), DEVELOPMENT_PROGRAMME, 60);
    expect(tickProgramme(resting, DEVELOPMENT_PROGRAMME, 20)).toMatchObject({ phase: "exercising", currentExerciseIndex: 1 });
    expect(startCurrentExercise(resting, DEVELOPMENT_PROGRAMME)).toMatchObject({ phase: "exercising", currentExerciseIndex: 1 });
  });

  it("Exercise 9 transitions to the next set at Exercise 1", () => {
    const setComplete = tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 0, 8), DEVELOPMENT_PROGRAMME, 60);
    expect(setComplete.phase).toBe("set-complete");
    expect(tickProgramme(setComplete, DEVELOPMENT_PROGRAMME, 20)).toMatchObject({
      phase: "exercising",
      currentSetIndex: 1,
      currentExerciseIndex: 0,
    });
  });

  it("the final Exercise 9 completes the programme", () => {
    expect(tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 2, 8), DEVELOPMENT_PROGRAMME, 60).phase).toBe("programme-complete");
  });

  it("supports the correct two-set sequence", () => {
    const programme = programmeWithSets(2);
    const expected = [...EXERCISE_LIBRARY, ...EXERCISE_LIBRARY].map((exercise) => exercise.id);
    expect(programmeExerciseOrder(programme)).toEqual(expected);
    expect(runOrder(programme)).toEqual(expected);
  });

  it("uses exercise-major order within each of three sets", () => {
    const programme = programmeWithSets(3);
    const expected = [...EXERCISE_LIBRARY, ...EXERCISE_LIBRARY, ...EXERCISE_LIBRARY].map((exercise) => exercise.id);
    expect(programmeExerciseOrder(programme)).toEqual(expected);
    expect(runOrder(programme)).toEqual(expected);
  });

  it("pause and resume preserve programme location and countdown", () => {
    const running = exercisingState(DEVELOPMENT_PROGRAMME, 1, 4);
    const paused = pauseProgramme(running);
    expect(tickProgramme(paused, DEVELOPMENT_PROGRAMME, 10)).toEqual(paused);
    expect(resumeProgramme(paused)).toMatchObject({ paused: false, currentSetIndex: 1, currentExerciseIndex: 4, exerciseTimeRemainingSeconds: 60 });
  });

  it("exit confirmation pauses and continue restores the previous running state", () => {
    const running = exercisingState(DEVELOPMENT_PROGRAMME, 1, 4);
    const suspended = suspendProgrammeForExit(running);
    expect(tickProgramme(suspended, DEVELOPMENT_PROGRAMME, 10)).toEqual(suspended);
    expect(restoreProgrammeAfterExit(suspended, false)).toMatchObject({ paused: false, currentSetIndex: 1, currentExerciseIndex: 4, exerciseTimeRemainingSeconds: 60 });
  });

  it("continue preserves a session that was already paused", () => {
    expect(restoreProgrammeAfterExit(suspendProgrammeForExit(exercisingState(DEVELOPMENT_PROGRAMME, 0, 0)), true).paused).toBe(true);
  });

  it("selects the correct video for every current exercise", () => {
    for (let index = 0; index < 9; index += 1) {
      const state = exercisingState(DEVELOPMENT_PROGRAMME, 0, index);
      expect(currentRunnerExercise(state, DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY)?.referenceVideo).toBe(
        `/videos/exercise-${String(index + 1).padStart(2, "0")}.mov`,
      );
    }
  });

  it("validates two- and three-set programmes and rejects an empty programme", () => {
    expect(validateRunnerProgramme(programmeWithSets(2), EXERCISE_LIBRARY).valid).toBe(true);
    expect(validateRunnerProgramme(programmeWithSets(3), EXERCISE_LIBRARY).valid).toBe(true);
    expect(validateRunnerProgramme({ id: "empty", name: "Empty", exercises: [] }, EXERCISE_LIBRARY)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Programme contains no exercises."]),
    });
  });
});

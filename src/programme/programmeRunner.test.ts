import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import type { ExerciseProgramme } from "../exercise/types";
import {
  createProgrammeRunnerState,
  currentRunnerExercise,
  pauseProgramme,
  processProgrammeRunnerEvent,
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
    } else if (state.phase === "ready") {
      state = startCurrentExercise(state, programme);
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

  it("counts generic repetition events and completes exactly at the target", () => {
    const programme: ExerciseProgramme = {
      ...programmeWithSets(2),
      exercises: programmeWithSets(2).exercises.map((item, index) => index === 0 ? {
        ...item,
        doseType: "repetitions" as const,
        dose: { repetitions: 2 },
      } : item),
    };
    let state = startCurrentExercise(startProgramme(createProgrammeRunnerState(programme), programme), programme);
    const event = { type: "repetition-completed" as const, exerciseId: "exercise-01", timestampMs: 1000, source: "developer" as const };
    state = processProgrammeRunnerEvent(state, programme, event);
    expect(state).toMatchObject({ phase: "exercising", completedRepetitions: 1 });
    state = processProgrammeRunnerEvent(state, programme, { ...event, timestampMs: 1100 });
    expect(state).toMatchObject({ phase: "resting", completedRepetitions: 2 });
    expect(processProgrammeRunnerEvent(state, programme, { ...event, timestampMs: 1200 })).toEqual(state);
  });

  it("ignores repetition events for the wrong exercise, while paused, or for duration doses", () => {
    const active = exercisingState(DEVELOPMENT_PROGRAMME, 0, 0);
    const event = { type: "repetition-completed" as const, exerciseId: "exercise-02", timestampMs: 1000, source: "recognition" as const };
    expect(processProgrammeRunnerEvent(active, DEVELOPMENT_PROGRAMME, event)).toEqual(active);
    expect(processProgrammeRunnerEvent({ ...active, paused: true }, DEVELOPMENT_PROGRAMME, { ...event, exerciseId: "exercise-01" })).toEqual({ ...active, paused: true });
    expect(processProgrammeRunnerEvent(active, DEVELOPMENT_PROGRAMME, { ...event, exerciseId: "exercise-01" })).toEqual(active);
  });

  it("skips the rest phase when rest is configured as zero", () => {
    const programme = {
      ...DEVELOPMENT_PROGRAMME,
      exercises: DEVELOPMENT_PROGRAMME.exercises.map((item) => ({ ...item, restBetweenSetsSeconds: 0 })),
    };
    expect(tickProgramme(exercisingState(programme, 0, 0), programme, 60)).toMatchObject({
      phase: "ready",
      currentSetIndex: 0,
      currentExerciseIndex: 1,
      restTimeRemainingSeconds: 0,
    });
  });

  it("rest timeout and Continue Now advance to the next exercise in the circuit", () => {
    const resting = tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 0, 0), DEVELOPMENT_PROGRAMME, 60);
    expect(tickProgramme(resting, DEVELOPMENT_PROGRAMME, 20)).toMatchObject({ phase: "exercising", currentExerciseIndex: 1, currentSetIndex: 0 });
    expect(startCurrentExercise(resting, DEVELOPMENT_PROGRAMME)).toMatchObject({ phase: "exercising", currentExerciseIndex: 1, currentSetIndex: 0 });
  });

  it("Exercise 9 completes one set and advances to Exercise 1 of the next set", () => {
    const transition = tickProgramme(exercisingState(DEVELOPMENT_PROGRAMME, 0, 8), DEVELOPMENT_PROGRAMME, 60);
    expect(transition).toMatchObject({ phase: "set-complete", currentSetIndex: 0, currentExerciseIndex: 8 });
    expect(startCurrentExercise(transition, DEVELOPMENT_PROGRAMME)).toMatchObject({
      phase: "exercising", currentSetIndex: 1, currentExerciseIndex: 0,
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

  it("runs the complete exercise circuit once within each of three sets", () => {
    const programme = programmeWithSets(3);
    const expected = [...EXERCISE_LIBRARY, ...EXERCISE_LIBRARY, ...EXERCISE_LIBRARY].map((exercise) => exercise.id);
    expect(programmeExerciseOrder(programme)).toEqual(expected);
    expect(runOrder(programme)).toEqual(expected);
  });

  it("regresses a mixed repetition/duration circuit through two complete sets", () => {
    const programme: ExerciseProgramme = {
      id: "mixed-circuit",
      name: "Mixed circuit",
      exercises: [
        { ...DEVELOPMENT_PROGRAMME.exercises[0], doseType: "repetitions", dose: { repetitions: 2 }, sets: 2, restBetweenSetsSeconds: 10 },
        { ...DEVELOPMENT_PROGRAMME.exercises[1], doseType: "duration", dose: { durationSeconds: 20 }, sets: 2, restBetweenSetsSeconds: 5 },
      ],
    };
    let state = startCurrentExercise(startProgramme(createProgrammeRunnerState(programme), programme), programme);
    const completed: string[] = [];
    for (let setIndex = 0; setIndex < 2; setIndex += 1) {
      completed.push(`${state.currentSetIndex}:exercise-01`);
      state = processProgrammeRunnerEvent(state, programme, { type: "repetition-completed", exerciseId: "exercise-01", timestampMs: setIndex * 1000, source: "developer" });
      state = processProgrammeRunnerEvent(state, programme, { type: "repetition-completed", exerciseId: "exercise-01", timestampMs: setIndex * 1000 + 1, source: "developer" });
      expect(state).toMatchObject({ phase: "resting", restTimeRemainingSeconds: 10 });
      state = tickProgramme(state, programme, 10);
      completed.push(`${state.currentSetIndex}:exercise-02`);
      state = tickProgramme(state, programme, 20);
      if (setIndex === 0) {
        expect(state).toMatchObject({ phase: "set-complete", restTimeRemainingSeconds: 5 });
        state = tickProgramme(state, programme, 5);
      }
    }
    expect(completed).toEqual(["0:exercise-01", "0:exercise-02", "1:exercise-01", "1:exercise-02"]);
    expect(state.phase).toBe("programme-complete");
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

  it("rejects mixed set counts because one set is a complete circuit", () => {
    const mixed = { ...DEVELOPMENT_PROGRAMME, exercises: DEVELOPMENT_PROGRAMME.exercises.map((item, index) => ({ ...item, sets: index === 0 ? 1 : 2 })) };
    expect(validateRunnerProgramme(mixed, EXERCISE_LIBRARY)).toMatchObject({
      valid: false,
      errors: expect.arrayContaining(["Circuit sequencing requires the same number of sets for every exercise."]),
    });
  });
});

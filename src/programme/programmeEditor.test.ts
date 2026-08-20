import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import {
  addExerciseToProgramme,
  changePrescriptionDoseType,
  moveProgrammeExercise,
  removeExerciseFromProgramme,
  searchExerciseLibrary,
  updateCircuitSetCount,
  updateProgrammePrescription,
} from "./programmeEditor";

describe("programme editor operations", () => {
  const oneExercise = { ...DEVELOPMENT_PROGRAMME, exercises: [DEVELOPMENT_PROGRAMME.exercises[0]] };

  it("searches names, categories and tags without case sensitivity", () => {
    expect(searchExerciseLibrary(EXERCISE_LIBRARY, "EXERCISE 02").map((item) => item.id)).toEqual(["exercise-02"]);
    expect(searchExerciseLibrary(EXERCISE_LIBRARY, "duration")).toHaveLength(9);
  });

  it("adds an independent default prescription and prevents duplicates", () => {
    const added = addExerciseToProgramme(oneExercise, EXERCISE_LIBRARY[1]);
    expect(added.exercises.map((item) => item.exerciseId)).toEqual(["exercise-01", "exercise-02"]);
    expect(addExerciseToProgramme(added, EXERCISE_LIBRARY[1])).toBe(added);
    added.exercises[1].dose.durationSeconds = 12;
    expect(EXERCISE_LIBRARY[1].defaultPrescription.dose.durationSeconds).toBe(60);
  });

  it("removes and reorders without allowing an empty programme", () => {
    expect(removeExerciseFromProgramme(oneExercise, 0)).toBe(oneExercise);
    const moved = moveProgrammeExercise(DEVELOPMENT_PROGRAMME, 0, 1);
    expect(moved.exercises.slice(0, 2).map((item) => item.exerciseId)).toEqual(["exercise-02", "exercise-01"]);
    expect(removeExerciseFromProgramme(moved, 0).exercises).toHaveLength(8);
  });

  it("edits programme prescriptions without changing library defaults", () => {
    const repetitions = changePrescriptionDoseType(oneExercise, 0, "repetitions");
    const edited = updateProgrammePrescription(repetitions, 0, { dose: { repetitions: 8 }, restBetweenSetsSeconds: 5 });
    expect(edited.exercises[0]).toMatchObject({ doseType: "repetitions", dose: { repetitions: 8 }, restBetweenSetsSeconds: 5 });
    expect(EXERCISE_LIBRARY[0].defaultPrescription.doseType).toBe("duration");
  });

  it("keeps the circuit set count consistent", () => {
    expect(updateCircuitSetCount(DEVELOPMENT_PROGRAMME, 2).exercises.every((item) => item.sets === 2)).toBe(true);
  });
});

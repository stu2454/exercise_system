import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "./exerciseLibrary";
import { exerciseInstruction, restInstruction, setProgressInstruction } from "./instructions";
import type { Exercise, ExerciseProgramme, ExercisePrescription } from "./types";
import { findExerciseById, validateDose, validateExercise, validatePrescription } from "./validation";
import { referenceVideoFilename, referenceVideoPath } from "./videoAssets";

const repetitionsExercise: Exercise = {
  id: "test-exercise",
  name: "Test Exercise",
  shortInstruction: "Follow the demonstration.",
  doseType: "repetitions",
  referenceVideo: "/videos/test.mov",
  defaultDose: { repetitions: 8 },
};

describe("Exercise model", () => {
  it("accepts a valid Exercise", () => {
    expect(validateExercise(repetitionsExercise)).toEqual({ valid: true, errors: [] });
  });

  it("allows a missing optional referenceVideo", () => {
    const { referenceVideo: _, ...exercise } = repetitionsExercise;
    expect(validateExercise(exercise)).toEqual({ valid: true, errors: [] });
  });

  it("accepts a .mov reference path", () => {
    expect(validateExercise({ ...repetitionsExercise, referenceVideo: "/videos/exercise.mov" }).valid).toBe(true);
  });

  it("accepts a .mp4 reference path", () => {
    expect(validateExercise({ ...repetitionsExercise, referenceVideo: "/videos/exercise.mp4" }).valid).toBe(true);
  });
});

describe("dose validation", () => {
  it("validates repetitions", () => {
    expect(validateDose("repetitions", { repetitions: 8 }).valid).toBe(true);
  });

  it("validates repetitions on each side", () => {
    expect(validateDose("repetitions-each-side", { repetitionsPerSide: 6 }).valid).toBe(true);
  });

  it("validates duration", () => {
    expect(validateDose("duration", { durationSeconds: 60 }).valid).toBe(true);
  });

  it("validates hold duration", () => {
    expect(validateDose("hold", { holdSeconds: 10 }).valid).toBe(true);
  });

  it("validates free movement without a numeric dose", () => {
    expect(validateDose("free", {}).valid).toBe(true);
  });

  it.each([
    ["repetitions", { durationSeconds: 30 }],
    ["repetitions-each-side", { repetitions: 6 }],
    ["duration", { durationSeconds: 0 }],
    ["hold", { holdSeconds: -1 }],
    ["free", { repetitions: 4 }],
    ["repetitions", { repetitions: 8, durationSeconds: 30 }],
  ] as const)("rejects invalid %s combinations", (doseType, dose) => {
    expect(validateDose(doseType, dose).valid).toBe(false);
  });
});

describe("prescriptions and programmes", () => {
  it("accepts a valid ExercisePrescription", () => {
    expect(validatePrescription({ exerciseId: repetitionsExercise.id, dose: { repetitions: 8 } }, repetitionsExercise).valid).toBe(true);
  });

  it("accepts positive sets", () => {
    expect(validatePrescription({ exerciseId: repetitionsExercise.id, dose: { repetitions: 8 }, sets: 2 }, repetitionsExercise).valid).toBe(true);
  });

  it("accepts two- and three-set duration prescriptions", () => {
    const durationExercise = { ...repetitionsExercise, doseType: "duration" as const };
    for (const sets of [2, 3]) {
      expect(validatePrescription({
        exerciseId: durationExercise.id,
        dose: { durationSeconds: 60 },
        sets,
      }, durationExercise).valid).toBe(true);
    }
  });

  it("accepts rest between sets", () => {
    const durationExercise = { ...repetitionsExercise, doseType: "duration" as const };
    expect(validatePrescription({
      exerciseId: durationExercise.id,
      dose: { durationSeconds: 60 },
      sets: 3,
      restBetweenSetsSeconds: 20,
    }, durationExercise).valid).toBe(true);
  });

  it("accepts restAfterSeconds", () => {
    expect(validatePrescription({ exerciseId: repetitionsExercise.id, dose: { repetitions: 8 }, restAfterSeconds: 20 }, repetitionsExercise).valid).toBe(true);
  });

  it("preserves explicit programme ordering", () => {
    const programme: ExerciseProgramme = {
      id: "ordered",
      name: "Ordered",
      exercises: [
        { exerciseId: "third", dose: {} },
        { exerciseId: "first", dose: {} },
        { exerciseId: "second", dose: {} },
      ],
    };
    expect(programme.exercises.map((item) => item.exerciseId)).toEqual(["third", "first", "second"]);
  });

  it("looks up an exercise by id", () => {
    expect(findExerciseById(EXERCISE_LIBRARY, "exercise-04")?.name).toBe("Exercise 04");
  });

  it("handles a missing exercise id safely", () => {
    expect(findExerciseById(EXERCISE_LIBRARY, "missing")).toBeUndefined();
    expect(validatePrescription({ exerciseId: "missing", dose: {} }, undefined)).toMatchObject({ valid: false });
  });
});

describe("instruction generation", () => {
  const instructionFor = (
    doseType: Exercise["doseType"],
    prescription: Omit<ExercisePrescription, "exerciseId">,
  ) => exerciseInstruction(
    { ...repetitionsExercise, doseType },
    { exerciseId: repetitionsExercise.id, ...prescription },
  );

  it("generates the repetitions instruction", () => {
    expect(instructionFor("repetitions", { dose: { repetitions: 8 } })).toBe("Complete 8 repetitions.");
  });

  it("generates the each-side instruction", () => {
    expect(instructionFor("repetitions-each-side", { dose: { repetitionsPerSide: 6 } })).toBe("Complete 6 repetitions on each side.");
  });

  it("generates the duration instruction", () => {
    expect(instructionFor("duration", { dose: { durationSeconds: 60 } })).toBe("Perform this exercise for 60 seconds.");
  });

  it("generates two- and three-set duration instructions", () => {
    expect(instructionFor("duration", { dose: { durationSeconds: 60 }, sets: 2 })).toBe(
      "Perform this exercise for 60 seconds. Complete 2 sets.",
    );
    expect(instructionFor("duration", { dose: { durationSeconds: 60 }, sets: 3 })).toBe(
      "Perform this exercise for 60 seconds. Complete 3 sets.",
    );
  });

  it("generates the hold instruction", () => {
    expect(instructionFor("hold", { dose: { holdSeconds: 10 } })).toBe("Hold for 10 seconds.");
  });

  it("generates a sets instruction", () => {
    expect(instructionFor("repetitions", { dose: { repetitions: 8 }, sets: 2 })).toBe("Complete 2 sets of 8 repetitions.");
  });

  it("generates a rest instruction", () => {
    expect(restInstruction(20)).toBe("Rest for 20 seconds.");
  });

  it("generates deterministic set progress", () => {
    expect(setProgressInstruction(1, 3)).toBe("Set 1 of 3");
    expect(setProgressInstruction(2, 3)).toBe("Set 2 of 3");
    expect(setProgressInstruction(4, 3)).toBeNull();
  });
});

describe("video assets", () => {
  it("maps .mov and .mp4 filenames to browser paths", () => {
    expect(referenceVideoPath("exercise-01.mov")).toBe("/videos/exercise-01.mov");
    expect(referenceVideoPath("exercise-02.mp4")).toBe("/videos/exercise-02.mp4");
    expect(referenceVideoFilename("/videos/exercise-01.mov")).toBe("exercise-01.mov");
  });

  it("handles a missing or invalid reference path", () => {
    expect(referenceVideoPath(undefined)).toBeNull();
    expect(referenceVideoFilename(undefined)).toBeNull();
    expect(referenceVideoFilename("/not-videos/exercise.mov")).toBeNull();
  });

  it("configures one exercise per discovered video", () => {
    expect(EXERCISE_LIBRARY).toHaveLength(9);
    expect(EXERCISE_LIBRARY.map((exercise) => exercise.referenceVideo)).toEqual(
      Array.from({ length: 9 }, (_, index) => `/videos/exercise-${String(index + 1).padStart(2, "0")}.mov`),
    );
    expect(EXERCISE_LIBRARY.every((exercise) => (
      exercise.doseType === "duration" &&
      exercise.defaultDose?.durationSeconds === 60 &&
      exercise.defaultSets === 3 &&
      exercise.defaultRestBetweenSetsSeconds === 20
    ))).toBe(true);
    expect(DEVELOPMENT_PROGRAMME.exercises).toHaveLength(9);
    expect(DEVELOPMENT_PROGRAMME.exercises.every((prescription) => (
      prescription.dose.durationSeconds === 60 &&
      prescription.sets === 3 &&
      prescription.restBetweenSetsSeconds === 20
    ))).toBe(true);
  });
});

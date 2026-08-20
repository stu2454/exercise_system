import { describe, expect, it } from "vitest";
import { EXERCISE_LIBRARY } from "./exerciseLibrary";
import { searchExerciseLibraryItems } from "./exerciseLibrarySearch";

describe("exercise library browsing", () => {
  it("searches stable id, name, metadata, dose and recognition text", () => {
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "exercise 03").map((item) => item.id)).toEqual(["exercise-03"]);
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "exercise-04").map((item) => item.id)).toEqual(["exercise-04"]);
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "duration")).toHaveLength(9);
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "none")).toHaveLength(9);
  });

  it("returns the library order for an empty query and no items for no match", () => {
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "").map((item) => item.id)).toEqual(EXERCISE_LIBRARY.map((item) => item.id));
    expect(searchExerciseLibraryItems(EXERCISE_LIBRARY, "not-an-exercise")).toEqual([]);
  });
});

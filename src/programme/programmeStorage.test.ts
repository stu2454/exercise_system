import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY } from "../exercise/exerciseLibrary";
import type { ExerciseProgramme } from "../exercise/types";
import {
  PROGRAMME_STORAGE_KEY,
  activeProgramme,
  createProgramme,
  defaultProgrammeCollection,
  deleteProgramme,
  loadProgrammeCollection,
  parseProgrammeCollection,
  saveProgrammeCollection,
  selectProgramme,
  updateProgramme,
  type ProgrammeStorage,
} from "./programmeStorage";

class MemoryStorage implements ProgrammeStorage {
  value: string | null = null;
  getItem(key: string): string | null { return key === PROGRAMME_STORAGE_KEY ? this.value : null; }
  setItem(key: string, value: string): void { if (key === PROGRAMME_STORAGE_KEY) this.value = value; }
}

function secondProgramme(): ExerciseProgramme {
  return {
    id: "programme-b",
    name: "Programme B",
    exercises: [{ ...DEVELOPMENT_PROGRAMME.exercises[0], dose: { durationSeconds: 30 }, sets: 2 }],
  };
}

describe("versioned local programme storage", () => {
  it("provides an independent default when storage is empty", () => {
    const loaded = loadProgrammeCollection(new MemoryStorage(), DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY);
    expect(activeProgramme(loaded).id).toBe(DEVELOPMENT_PROGRAMME.id);
    loaded.programmes[0].exercises[0].dose.durationSeconds = 15;
    expect(DEVELOPMENT_PROGRAMME.exercises[0].dose.durationSeconds).toBe(60);
  });

  it.each(["not-json", JSON.stringify({ schemaVersion: 999 }), JSON.stringify({ schemaVersion: 1, activeProgrammeId: "missing", programmes: [] })])(
    "falls back safely for malformed or incompatible storage",
    (value) => {
      const storage = new MemoryStorage(); storage.value = value;
      expect(loadProgrammeCollection(storage, DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY).activeProgrammeId).toBe(DEVELOPMENT_PROGRAMME.id);
    },
  );

  it("round-trips multiple programmes and active selection", () => {
    const storage = new MemoryStorage();
    let collection = createProgramme(defaultProgrammeCollection(DEVELOPMENT_PROGRAMME), secondProgramme());
    collection = selectProgramme(collection, "programme-b");
    expect(saveProgrammeCollection(storage, collection)).toBe(true);
    const loaded = loadProgrammeCollection(storage, DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY);
    expect(loaded.programmes).toHaveLength(2);
    expect(activeProgramme(loaded).name).toBe("Programme B");
  });

  it("updates a programme without changing the default or another copy", () => {
    let collection = createProgramme(defaultProgrammeCollection(DEVELOPMENT_PROGRAMME), secondProgramme());
    const changed = { ...secondProgramme(), name: "Edited B", exercises: secondProgramme().exercises.map((item) => ({ ...item, dose: { durationSeconds: 20 } })) };
    collection = updateProgramme(collection, changed);
    expect(collection.programmes.find((item) => item.id === "programme-b")?.name).toBe("Edited B");
    expect(collection.programmes[0].exercises[0].dose.durationSeconds).toBe(60);
  });

  it("deletes programmes, selects a safe fallback and never deletes the last", () => {
    const two = createProgramme(defaultProgrammeCollection(DEVELOPMENT_PROGRAMME), secondProgramme());
    const deleted = deleteProgramme(two, "programme-b");
    expect(deleted.programmes).toHaveLength(1);
    expect(deleted.activeProgrammeId).toBe(DEVELOPMENT_PROGRAMME.id);
    expect(deleteProgramme(deleted, DEVELOPMENT_PROGRAMME.id)).toBe(deleted);
  });

  it("ignores unknown selection, update and duplicate creation requests", () => {
    const collection = defaultProgrammeCollection(DEVELOPMENT_PROGRAMME);
    expect(selectProgramme(collection, "missing")).toBe(collection);
    expect(updateProgramme(collection, secondProgramme())).toBe(collection);
    expect(createProgramme(collection, DEVELOPMENT_PROGRAMME)).toBe(collection);
  });

  it("rejects duplicate IDs and malformed prescriptions while parsing", () => {
    const collection = defaultProgrammeCollection(DEVELOPMENT_PROGRAMME);
    const duplicate = { ...collection, programmes: [collection.programmes[0], collection.programmes[0]] };
    expect(parseProgrammeCollection(JSON.stringify(duplicate), EXERCISE_LIBRARY)).toBeNull();
    const malformed = { ...collection, programmes: [{ ...collection.programmes[0], exercises: [{ exerciseId: "missing", dose: {} }] }] };
    expect(parseProgrammeCollection(JSON.stringify(malformed), EXERCISE_LIBRARY)).toBeNull();
  });

  it("continues in memory if browser storage throws", () => {
    const blocked: ProgrammeStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadProgrammeCollection(blocked, DEVELOPMENT_PROGRAMME, EXERCISE_LIBRARY).programmes).toHaveLength(1);
    expect(saveProgrammeCollection(blocked, defaultProgrammeCollection(DEVELOPMENT_PROGRAMME))).toBe(false);
  });
});

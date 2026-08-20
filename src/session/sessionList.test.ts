import { describe, expect, it } from "vitest";
import type { ProgrammeSessionResult } from "./programmeSession";
import { filterSessionHistory, summariseSessionListItem } from "./sessionList";

function result(id: string, programmeId: string, status: "completed" | "aborted", endedAt: number): ProgrammeSessionResult {
  return {
    sessionId: id, programmeId, programmeNameSnapshot: `${programmeId} snapshot`, startedAtTimestampMs: endedAt - 120_000,
    completedAtTimestampMs: status === "completed" ? endedAt : undefined, status,
    endedReason: status === "completed" ? "completed" : "participant_exit", endedAtTimestampMs: endedAt,
    exercises: [
      { exerciseId: "one", prescribed: { exerciseId: "one", doseType: "duration", dose: { durationSeconds: 60 }, sets: 2 }, sets: [{ setIndex: 0, completed: true }, { setIndex: 1, completed: true }] },
      { exerciseId: "two", prescribed: { exerciseId: "two", doseType: "duration", dose: { durationSeconds: 60 }, sets: 2 }, sets: [{ setIndex: 0, completed: true }, { setIndex: 1, completed: false }] },
    ],
    intervals: [],
  };
}

describe("session history list", () => {
  it("summarises completed exercise sets and only fully completed circuits", () => {
    expect(summariseSessionListItem(result("a", "programme-a", "aborted", 180_000))).toEqual({
      prescribedExerciseSets: 4, completedExerciseSets: 3,
      prescribedCircuitSets: 2, completedCircuitSets: 1, elapsedMinutes: 2,
    });
  });

  it("filters by programme and status and returns newest first", () => {
    const sessions = [
      result("old", "programme-a", "completed", 100),
      result("new", "programme-a", "aborted", 300),
      result("other", "programme-b", "aborted", 200),
    ];
    expect(filterSessionHistory(sessions, { programmeId: "programme-a", status: null }).map((item) => item.sessionId)).toEqual(["new", "old"]);
    expect(filterSessionHistory(sessions, { programmeId: null, status: "aborted" }).map((item) => item.sessionId)).toEqual(["new", "other"]);
  });

  it("does not mutate the supplied history order", () => {
    const sessions = [result("old", "a", "completed", 100), result("new", "a", "completed", 200)];
    filterSessionHistory(sessions, { programmeId: null, status: null });
    expect(sessions.map((item) => item.sessionId)).toEqual(["old", "new"]);
  });
});

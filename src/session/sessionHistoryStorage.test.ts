import { describe, expect, it } from "vitest";
import { DEVELOPMENT_PROGRAMME } from "../exercise/exerciseLibrary";
import { ProgrammeSessionTracker } from "./programmeSession";
import {
  SESSION_HISTORY_STORAGE_KEY,
  addFinalisedSession,
  emptySessionHistory,
  loadSessionHistory,
  newestSessions,
  parseSessionHistory,
  persistSessionHistory,
  type SessionHistoryStorage,
} from "./sessionHistoryStorage";

class MemoryStorage implements SessionHistoryStorage {
  value: string | null = null;
  getItem(key: string) { return key === SESSION_HISTORY_STORAGE_KEY ? this.value : null; }
  setItem(key: string, value: string) { if (key === SESSION_HISTORY_STORAGE_KEY) this.value = value; }
}

function session(id: string, endedAtTimestampMs: number, name = "Programme snapshot") {
  const programme = { ...DEVELOPMENT_PROGRAMME, name };
  return new ProgrammeSessionTracker(programme, endedAtTimestampMs - 100, id).finish("completed", "completed", endedAtTimestampMs);
}

describe("versioned structured session history", () => {
  it("round-trips finalised sessions and retains the programme-name snapshot", () => {
    const storage = new MemoryStorage();
    const history = addFinalisedSession(emptySessionHistory(), session("session-a", 200, "Original name"));
    expect(persistSessionHistory(storage, history)).toBe(true);
    expect(loadSessionHistory(storage).sessions[0]).toMatchObject({ sessionId: "session-a", programmeNameSnapshot: "Original name" });
  });

  it("saves a session ID only once and does not overwrite its final result", () => {
    const first = addFinalisedSession(emptySessionHistory(), session("session-a", 200));
    expect(addFinalisedSession(first, session("session-a", 999, "Changed"))).toBe(first);
    expect(first.sessions).toHaveLength(1);
  });

  it("returns newest sessions first without mutating stored order", () => {
    const history = { ...emptySessionHistory(), sessions: [session("older", 100), session("newer", 300), session("middle", 200)] };
    expect(newestSessions(history).map((item) => item.sessionId)).toEqual(["newer", "middle", "older"]);
    expect(history.sessions.map((item) => item.sessionId)).toEqual(["older", "newer", "middle"]);
  });

  it.each([
    "not-json",
    JSON.stringify({ schemaVersion: 999, sessions: [] }),
    JSON.stringify({ schemaVersion: 1, sessions: [{ sessionId: "broken" }] }),
  ])("rejects malformed or incompatible history safely", (value) => {
    const storage = new MemoryStorage(); storage.value = value;
    expect(parseSessionHistory(value)).toBeNull();
    expect(loadSessionHistory(storage)).toEqual(emptySessionHistory());
  });

  it("rejects duplicate IDs and survives blocked browser storage", () => {
    const duplicate = { ...emptySessionHistory(), sessions: [session("same", 100), session("same", 200)] };
    expect(parseSessionHistory(JSON.stringify(duplicate))).toBeNull();
    const blocked: SessionHistoryStorage = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    expect(loadSessionHistory(blocked)).toEqual(emptySessionHistory());
    expect(persistSessionHistory(blocked, emptySessionHistory())).toBe(false);
  });

  it("persists only the structured result shape", () => {
    const withUnexpectedDiagnostic = { ...session("session-a", 200), poseFrames: [{ raw: true }] };
    const stored = addFinalisedSession(emptySessionHistory(), withUnexpectedDiagnostic);
    expect(stored.sessions[0]).not.toHaveProperty("poseFrames");
  });
});

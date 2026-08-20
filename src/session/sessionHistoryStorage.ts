import type { ExercisePrescription } from "../exercise/types";
import type { ExerciseIntervalRecord, ProgrammeSessionExerciseResult, ProgrammeSessionResult, ProgrammeSessionSetResult } from "./programmeSession";

export const SESSION_HISTORY_SCHEMA_VERSION = 1;
export const SESSION_HISTORY_STORAGE_KEY = "exercise-engagement.session-history.v1";

export interface SessionHistoryStore {
  schemaVersion: typeof SESSION_HISTORY_SCHEMA_VERSION;
  sessions: ProgrammeSessionResult[];
}

export interface SessionHistoryStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function optionalFiniteNumber(value: unknown): value is number | undefined {
  return value === undefined || finiteNumber(value);
}

function isPrescription(value: unknown): value is ExercisePrescription {
  return isRecord(value) && typeof value.exerciseId === "string" && value.exerciseId.length > 0 &&
    isRecord(value.dose) && (value.sets === undefined || (finiteNumber(value.sets) && Number.isInteger(value.sets) && value.sets > 0));
}

function isSetResult(value: unknown): value is ProgrammeSessionSetResult {
  return isRecord(value) && finiteNumber(value.setIndex) && Number.isInteger(value.setIndex) && value.setIndex >= 0 &&
    optionalFiniteNumber(value.targetRepetitions) && optionalFiniteNumber(value.completedRepetitions) &&
    optionalFiniteNumber(value.targetDurationSeconds) && optionalFiniteNumber(value.completedDurationSeconds) &&
    typeof value.completed === "boolean";
}

function isExerciseResult(value: unknown): value is ProgrammeSessionExerciseResult {
  return isRecord(value) && typeof value.exerciseId === "string" && value.exerciseId.length > 0 &&
    isPrescription(value.prescribed) && Array.isArray(value.sets) && value.sets.every(isSetResult);
}

function isInterval(value: unknown): value is ExerciseIntervalRecord {
  return isRecord(value) && finiteNumber(value.setIndex) && finiteNumber(value.exerciseIndex) &&
    typeof value.exerciseId === "string" && finiteNumber(value.elapsedExerciseTimeSeconds) &&
    finiteNumber(value.completedRepetitions) && finiteNumber(value.timestampMs) &&
    (value.validObservationFraction === null || finiteNumber(value.validObservationFraction)) && typeof value.partial === "boolean";
}

function isSessionResult(value: unknown): value is ProgrammeSessionResult {
  return isRecord(value) && typeof value.sessionId === "string" && value.sessionId.length > 0 &&
    typeof value.programmeId === "string" && value.programmeId.length > 0 &&
    typeof value.programmeNameSnapshot === "string" && value.programmeNameSnapshot.length > 0 &&
    finiteNumber(value.startedAtTimestampMs) && optionalFiniteNumber(value.completedAtTimestampMs) &&
    (value.status === "completed" || value.status === "aborted") &&
    (value.endedReason === "completed" || value.endedReason === "participant_exit" || value.endedReason === "developer_exit" || value.endedReason === "error") &&
    finiteNumber(value.endedAtTimestampMs) && Array.isArray(value.exercises) && value.exercises.every(isExerciseResult) &&
    Array.isArray(value.intervals) && value.intervals.every(isInterval);
}

function clonePrescription(prescribed: ExercisePrescription): ExercisePrescription {
  return { ...prescribed, dose: { ...prescribed.dose } };
}

export function cloneSessionResult(session: ProgrammeSessionResult): ProgrammeSessionResult {
  return {
    sessionId: session.sessionId,
    programmeId: session.programmeId,
    programmeNameSnapshot: session.programmeNameSnapshot,
    startedAtTimestampMs: session.startedAtTimestampMs,
    completedAtTimestampMs: session.completedAtTimestampMs,
    status: session.status,
    endedReason: session.endedReason,
    endedAtTimestampMs: session.endedAtTimestampMs,
    exercises: session.exercises.map((exercise) => ({
      exerciseId: exercise.exerciseId,
      prescribed: clonePrescription(exercise.prescribed),
      sets: exercise.sets.map((set) => ({ ...set })),
    })),
    intervals: session.intervals.map((interval) => ({ ...interval })),
  };
}

export function emptySessionHistory(): SessionHistoryStore {
  return { schemaVersion: SESSION_HISTORY_SCHEMA_VERSION, sessions: [] };
}

export function parseSessionHistory(json: string): SessionHistoryStore | null {
  try {
    const value: unknown = JSON.parse(json);
    if (!isRecord(value) || value.schemaVersion !== SESSION_HISTORY_SCHEMA_VERSION ||
      !Array.isArray(value.sessions) || !value.sessions.every(isSessionResult)) return null;
    const sessions = value.sessions as ProgrammeSessionResult[];
    const ids = sessions.map((session) => session.sessionId);
    if (new Set(ids).size !== ids.length) return null;
    return { schemaVersion: SESSION_HISTORY_SCHEMA_VERSION, sessions: sessions.map(cloneSessionResult) };
  } catch {
    return null;
  }
}

export function loadSessionHistory(storage: SessionHistoryStorage | null): SessionHistoryStore {
  if (storage) {
    try {
      const stored = storage.getItem(SESSION_HISTORY_STORAGE_KEY);
      const parsed = stored ? parseSessionHistory(stored) : null;
      if (parsed) return parsed;
    } catch {
      // Storage may be unavailable; continue with safe in-memory history.
    }
  }
  return emptySessionHistory();
}

export function persistSessionHistory(storage: SessionHistoryStorage | null, history: SessionHistoryStore): boolean {
  if (!storage) return false;
  try { storage.setItem(SESSION_HISTORY_STORAGE_KEY, JSON.stringify(history)); return true; } catch { return false; }
}

export function addFinalisedSession(history: SessionHistoryStore, session: ProgrammeSessionResult): SessionHistoryStore {
  if (history.sessions.some((item) => item.sessionId === session.sessionId)) return history;
  return { ...history, sessions: [cloneSessionResult(session), ...history.sessions] };
}

export function newestSessions(history: SessionHistoryStore): ProgrammeSessionResult[] {
  return [...history.sessions].sort((a, b) => b.endedAtTimestampMs - a.endedAtTimestampMs).map(cloneSessionResult);
}

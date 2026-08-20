import type { ProgrammeSessionResult, SessionStatus } from "./programmeSession";

export interface SessionListFilters {
  programmeId: string | null;
  status: SessionStatus | null;
}

export interface SessionListSummary {
  prescribedExerciseSets: number;
  completedExerciseSets: number;
  prescribedCircuitSets: number;
  completedCircuitSets: number;
  elapsedMinutes: number;
}

export function summariseSessionListItem(session: ProgrammeSessionResult): SessionListSummary {
  const prescribedExerciseSets = session.exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  const completedExerciseSets = session.exercises.reduce((total, exercise) => total + exercise.sets.filter((set) => set.completed).length, 0);
  const prescribedCircuitSets = session.exercises.reduce((maximum, exercise) => Math.max(maximum, exercise.sets.length), 0);
  let completedCircuitSets = 0;
  for (let setIndex = 0; setIndex < prescribedCircuitSets; setIndex += 1) {
    if (session.exercises.length > 0 && session.exercises.every((exercise) => exercise.sets[setIndex]?.completed === true)) completedCircuitSets += 1;
  }
  return {
    prescribedExerciseSets,
    completedExerciseSets,
    prescribedCircuitSets,
    completedCircuitSets,
    elapsedMinutes: Math.max(0, (session.endedAtTimestampMs - session.startedAtTimestampMs) / 60_000),
  };
}

export function filterSessionHistory(
  sessions: readonly ProgrammeSessionResult[],
  filters: SessionListFilters,
): ProgrammeSessionResult[] {
  return sessions
    .filter((session) => filters.programmeId === null || session.programmeId === filters.programmeId)
    .filter((session) => filters.status === null || session.status === filters.status)
    .sort((a, b) => b.endedAtTimestampMs - a.endedAtTimestampMs);
}

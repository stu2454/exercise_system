import { useMemo, useState } from "react";
import type { ProgrammeSessionResult, SessionStatus } from "../session/programmeSession";
import { filterSessionHistory, summariseSessionListItem } from "../session/sessionList";

function formatSessionDate(timestampMs: number): string {
  const date = new Date(timestampMs);
  return Number.isFinite(date.valueOf()) && date.getUTCFullYear() >= 2000
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date)
    : "Date unavailable";
}

function sessionDateTime(timestampMs: number): string | undefined {
  const date = new Date(timestampMs);
  return Number.isFinite(date.valueOf()) && date.getUTCFullYear() >= 2000 ? date.toISOString() : undefined;
}

function formatMinutes(minutes: number): string {
  if (minutes > 0 && minutes < 1) return "<1 min";
  return `${Math.round(minutes)} min`;
}

export function SessionsPanel({ sessions }: { sessions: readonly ProgrammeSessionResult[] }) {
  const [programmeId, setProgrammeId] = useState<string | null>(null);
  const [status, setStatus] = useState<SessionStatus | null>(null);
  const visibleSessions = useMemo(() => filterSessionHistory(sessions, { programmeId, status }), [programmeId, sessions, status]);
  const programmes = useMemo(() => {
    const snapshots = new Map<string, string>();
    for (const session of sessions) if (!snapshots.has(session.programmeId)) snapshots.set(session.programmeId, session.programmeNameSnapshot);
    return [...snapshots.entries()];
  }, [sessions]);

  return (
    <section className="development-section sessions-panel">
      <div className="development-section__heading">
        <p className="eyebrow">Build 7 · Sessions</p>
        <h2>Session history</h2>
        <p>Finalised structured results stored locally on this browser. Diagnostic recordings remain separate downloads.</p>
      </div>

      <div className="sessions-filters">
        <label>Programme
          <select value={programmeId ?? ""} onChange={(event) => setProgrammeId(event.target.value || null)}>
            <option value="">All programmes</option>
            {programmes.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
          </select>
        </label>
        <label>Status
          <select value={status ?? ""} onChange={(event) => setStatus((event.target.value || null) as SessionStatus | null)}>
            <option value="">All statuses</option>
            <option value="completed">Completed</option>
            <option value="aborted">Stopped early</option>
          </select>
        </label>
      </div>

      {visibleSessions.length === 0 ? (
        <p className="sessions-empty">{sessions.length === 0 ? "No finalised sessions have been saved yet." : "No sessions match these filters."}</p>
      ) : (
        <div className="sessions-list">
          {visibleSessions.map((session) => {
            const summary = summariseSessionListItem(session);
            return (
              <article className="session-list-item" key={session.sessionId}>
                <div className="session-list-item__heading">
                  <div><time dateTime={sessionDateTime(session.endedAtTimestampMs)}>{formatSessionDate(session.endedAtTimestampMs)}</time><h3>{session.programmeNameSnapshot}</h3></div>
                  <strong className={`session-status session-status--${session.status}`}>{session.status === "completed" ? "Completed" : "Stopped early"}</strong>
                </div>
                <dl>
                  <div><dt>Circuit sets</dt><dd>{summary.completedCircuitSets} / {summary.prescribedCircuitSets}</dd></div>
                  <div><dt>Exercise sets</dt><dd>{summary.completedExerciseSets} / {summary.prescribedExerciseSets}</dd></div>
                  <div><dt>Elapsed</dt><dd>{formatMinutes(summary.elapsedMinutes)}</dd></div>
                </dl>
                <button className="button button--secondary" type="button" disabled title="Session detail is added in Stage 7">View details — Stage 7</button>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

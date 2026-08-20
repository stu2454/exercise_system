import { useCallback, useEffect, useState } from "react";
import type { ProgrammeSessionResult } from "./programmeSession";
import { addFinalisedSession, loadSessionHistory, newestSessions, persistSessionHistory } from "./sessionHistoryStorage";

function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function useSessionHistory() {
  const [history, setHistory] = useState(() => loadSessionHistory(browserStorage()));
  useEffect(() => { persistSessionHistory(browserStorage(), history); }, [history]);
  return {
    history,
    sessions: newestSessions(history),
    save: useCallback((session: ProgrammeSessionResult) => setHistory((current) => addFinalisedSession(current, session)), []),
  };
}

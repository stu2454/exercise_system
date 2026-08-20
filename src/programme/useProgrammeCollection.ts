import { useCallback, useEffect, useMemo, useState } from "react";
import type { Exercise, ExerciseProgramme } from "../exercise/types";
import {
  activeProgramme,
  createProgramme,
  deleteProgramme,
  loadProgrammeCollection,
  saveProgrammeCollection,
  selectProgramme,
  updateProgramme,
} from "./programmeStorage";

function browserStorage(): Storage | null {
  try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; }
}

export function useProgrammeCollection(
  defaultProgramme: ExerciseProgramme,
  exercises: readonly Exercise[],
) {
  const [collection, setCollection] = useState(() => loadProgrammeCollection(browserStorage(), defaultProgramme, exercises));
  useEffect(() => { saveProgrammeCollection(browserStorage(), collection); }, [collection]);
  return {
    collection,
    activeProgramme: useMemo(() => activeProgramme(collection), [collection]),
    create: useCallback((programme: ExerciseProgramme) => setCollection((current) => createProgramme(current, programme)), []),
    update: useCallback((programme: ExerciseProgramme) => setCollection((current) => updateProgramme(current, programme)), []),
    remove: useCallback((id: string) => setCollection((current) => deleteProgramme(current, id)), []),
    select: useCallback((id: string) => setCollection((current) => selectProgramme(current, id)), []),
  };
}

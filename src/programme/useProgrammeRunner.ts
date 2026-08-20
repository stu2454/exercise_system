import { useCallback, useEffect, useRef, useState } from "react";
import type { Exercise, ExerciseProgramme } from "../exercise/types";
import type { ProcessedPoseFrame } from "../pose/types";
import {
  createProgrammeRunnerState,
  currentRunnerExercise,
  pauseProgramme,
  processProgrammeRunnerEvent,
  restartCurrentExercise,
  resumeProgramme,
  skipToNextExercise,
  startCurrentExercise,
  startProgramme,
  suspendProgrammeForExit,
  restoreProgrammeAfterExit,
  tickProgramme,
  validateRunnerProgramme,
  type ProgrammeRunnerState,
} from "./programmeRunner";
import {
  RightArmReadyGestureDetector,
  type ReadyGestureStatus,
  type ReadyGestureDiagnostics,
} from "./readyGesture";
import type { ProgrammeRunnerEvent } from "./runnerEvents";

export function useProgrammeRunner(
  programme: ExerciseProgramme,
  exercises: readonly Exercise[],
) {
  const validation = validateRunnerProgramme(programme, exercises);
  const detectorRef = useRef(new RightArmReadyGestureDetector());
  const programmeRef = useRef(programme);
  const gestureAdvanceTimerRef = useRef<number | null>(null);
  const stateRef = useRef(createProgrammeRunnerState(programme));
  const [state, setState] = useState(stateRef.current);
  const [gestureStatus, setGestureStatus] = useState<ReadyGestureStatus>("not-detected");
  const [gestureDiagnostics, setGestureDiagnostics] = useState<ReadyGestureDiagnostics>(() => detectorRef.current.getDiagnostics());

  const clearGestureAdvance = useCallback(() => {
    if (gestureAdvanceTimerRef.current !== null) {
      window.clearTimeout(gestureAdvanceTimerRef.current);
      gestureAdvanceTimerRef.current = null;
    }
  }, []);

  const apply = useCallback((
    transform: (current: ProgrammeRunnerState) => ProgrammeRunnerState,
    resetGestureOnTransition = true,
  ) => {
    setState((current) => {
      const next = transform(current);
      const transitioned = next.phase !== current.phase ||
        next.currentSetIndex !== current.currentSetIndex ||
        next.currentExerciseIndex !== current.currentExerciseIndex;
      if (transitioned && resetGestureOnTransition) {
        detectorRef.current.reset(true);
        setGestureStatus("not-detected");
      }
      stateRef.current = next;
      return next;
    });
  }, []);

  useEffect(() => {
    if (state.paused || !(["exercising", "resting", "set-complete"] as const).includes(
      state.phase as "exercising" | "resting" | "set-complete",
    )) return;
    let previousMs = performance.now();
    const timer = window.setInterval(() => {
      const nowMs = performance.now();
      const elapsedSeconds = (nowMs - previousMs) / 1000;
      previousMs = nowMs;
      apply((current) => tickProgramme(current, programme, elapsedSeconds));
    }, 250);
    return () => window.clearInterval(timer);
  }, [apply, programme, state.paused, state.phase]);

  const processPoseFrame = useCallback((processed: ProcessedPoseFrame) => {
    const current = stateRef.current;
    const enabled = !current.paused && (
      current.phase === "ready" ||
      current.phase === "resting" ||
      current.phase === "set-complete"
    );
    const gesture = detectorRef.current.update(
      processed.filteredPoseFrame,
      processed.poseQuality,
      processed.timestampMs,
      enabled,
    );
    setGestureStatus((previous) => previous === gesture.status ? previous : gesture.status);
    setGestureDiagnostics(gesture.diagnostics);
    if (gesture.triggered) {
      if (gestureAdvanceTimerRef.current !== null) window.clearTimeout(gestureAdvanceTimerRef.current);
      gestureAdvanceTimerRef.current = window.setTimeout(() => {
        gestureAdvanceTimerRef.current = null;
        apply((runnerState) => startCurrentExercise(runnerState, programme), false);
      }, 350);
    }
  }, [apply, programme]);

  useEffect(() => () => {
    if (gestureAdvanceTimerRef.current !== null) window.clearTimeout(gestureAdvanceTimerRef.current);
  }, []);

  useEffect(() => {
    if (programmeRef.current === programme) return;
    programmeRef.current = programme;
    clearGestureAdvance();
    detectorRef.current.reset(false);
    setGestureStatus("not-detected");
    const initial = createProgrammeRunnerState(programme);
    stateRef.current = initial;
    setState(initial);
  }, [clearGestureAdvance, programme]);

  const beginProgramme = useCallback(() => {
    if (!validation.valid) return;
    clearGestureAdvance();
    detectorRef.current.reset(false);
    setGestureStatus("not-detected");
    apply((current) => startProgramme(current, programme));
  }, [apply, clearGestureAdvance, programme, validation.valid]);

  const beginExercise = useCallback(() => {
    clearGestureAdvance();
    apply((current) => startCurrentExercise(current, programme));
  }, [apply, clearGestureAdvance, programme]);

  const pauseForExit = useCallback(() => {
    clearGestureAdvance();
    apply(suspendProgrammeForExit, false);
  }, [apply, clearGestureAdvance]);

  const continueAfterExit = useCallback((wasPaused: boolean) => {
    detectorRef.current.reset(true);
    setGestureStatus("not-detected");
    apply((current) => restoreProgrammeAfterExit(current, wasPaused), false);
  }, [apply]);

  const restartExercise = useCallback(() => {
    clearGestureAdvance();
    detectorRef.current.reset(true);
    setGestureStatus("not-detected");
    apply((current) => restartCurrentExercise(current, programme));
  }, [apply, clearGestureAdvance, programme]);

  const skip = useCallback(() => {
    clearGestureAdvance();
    detectorRef.current.reset(true);
    setGestureStatus("not-detected");
    apply((current) => skipToNextExercise(current, programme));
  }, [apply, clearGestureAdvance, programme]);

  const processRunnerEvent = useCallback((event: ProgrammeRunnerEvent) => {
    apply((current) => processProgrammeRunnerEvent(current, programme, event));
  }, [apply, programme]);

  const addDeveloperRepetition = useCallback(() => {
    const exerciseId = programme.exercises[stateRef.current.currentExerciseIndex]?.exerciseId;
    if (!exerciseId) return;
    processRunnerEvent({
      type: "repetition-completed",
      exerciseId,
      timestampMs: performance.now(),
      source: "developer",
    });
  }, [processRunnerEvent, programme]);

  const returnToProgramme = useCallback(() => {
    clearGestureAdvance();
    detectorRef.current.reset(true);
    setGestureStatus("not-detected");
    const initial = createProgrammeRunnerState(programme);
    stateRef.current = initial;
    setState(initial);
  }, [clearGestureAdvance, programme]);

  const currentPrescription = programme.exercises[state.currentExerciseIndex] ?? null;
  const currentExercise = currentRunnerExercise(state, programme, exercises) ?? null;

  return {
    state,
    validation,
    totalSets: validation.totalSets,
    currentExercise,
    currentPrescription,
    gestureStatus,
    gestureDiagnostics,
    processPoseFrame,
    processRunnerEvent,
    addDeveloperRepetition,
    beginProgramme,
    beginExercise,
    pause: () => apply(pauseProgramme),
    resume: () => apply(resumeProgramme),
    pauseForExit,
    continueAfterExit,
    restartExercise,
    skip,
    returnToProgramme,
    startAgain: beginProgramme,
  };
}

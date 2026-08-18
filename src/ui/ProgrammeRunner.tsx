import type { Exercise, ExerciseProgramme } from "../exercise/types";
import type { ReturnTypeOfProgrammeRunner } from "../programme/useProgrammeRunnerTypes";
import { ExerciseCard } from "./ExerciseCard";

interface ProgrammeRunnerProps {
  programme: ExerciseProgramme;
  exercises: readonly Exercise[];
  runner: ReturnTypeOfProgrammeRunner;
  onLaunchParticipantMode: () => void;
}

const GESTURE_LABELS = {
  "not-detected": "NOT DETECTED",
  holding: "HOLDING…",
  triggered: "READY TRIGGERED",
} as const;

function roundedSeconds(value: number): number {
  return Math.max(0, Math.ceil(value));
}

export function ProgrammeRunner({
  programme,
  exercises,
  runner,
  onLaunchParticipantMode,
}: ProgrammeRunnerProps) {
  const { state, currentExercise, currentPrescription } = runner;
  const exerciseCount = programme.exercises.length;
  const totalSets = runner.totalSets;
  const nextExerciseIndex = state.currentExerciseIndex === exerciseCount - 1
    ? 0
    : state.currentExerciseIndex + 1;
  const nextSetIndex = state.currentExerciseIndex === exerciseCount - 1
    ? state.currentSetIndex + 1
    : state.currentSetIndex;
  const nextPrescription = programme.exercises[nextExerciseIndex];
  const nextExercise = exercises.find((exercise) => exercise.id === nextPrescription?.exerciseId);
  const active = state.phase !== "idle" && state.phase !== "programme-complete";

  return (
    <section className="development-section programme-runner">
      <p className="eyebrow">Build 6B · Participant programme runner</p>
      <h2>{programme.name}</h2>
      <button
        className="button button--primary launch-participant-mode"
        type="button"
        onClick={onLaunchParticipantMode}
        disabled={!runner.validation.valid}
      >
        LAUNCH PARTICIPANT MODE
      </button>

      {state.phase === "idle" && (
        <div className="runner-message">
          <p>{exerciseCount} exercises · {totalSets || "—"} sets</p>
          {!runner.validation.valid && (
            <div className="programme-error" role="alert">
              <strong>Programme cannot start</strong>
              <ul>{runner.validation.errors.map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          )}
          <button
            className="button button--primary"
            type="button"
            disabled={!runner.validation.valid}
            onClick={runner.beginProgramme}
          >
            START PROGRAMME
          </button>
        </div>
      )}

      {active && (
        <>
          <div className="runner-progress" aria-label="Programme progress">
            <strong>Set {state.currentSetIndex + 1} of {totalSets}</strong>
            <span>Exercise {state.currentExerciseIndex + 1} of {exerciseCount}</span>
            <div className="runner-progress__dots">
              {programme.exercises.map((prescription, index) => (
                <span
                  className={index === state.currentExerciseIndex ? "runner-progress__current" : ""}
                  key={prescription.exerciseId}
                >
                  {index + 1} {index === state.currentExerciseIndex ? "●" : "○"}
                </span>
              ))}
            </div>
          </div>

          {(state.phase === "ready" || state.phase === "exercising") && currentExercise && currentPrescription && (
            <ExerciseCard
              exercise={currentExercise}
              prescription={currentPrescription}
              onStart={state.phase === "ready" ? runner.beginExercise : undefined}
              videoActive={state.phase === "exercising" && !state.paused}
              currentSetNumber={state.currentSetIndex + 1}
            >
              {state.phase === "ready" ? (
                <p>Raise your right arm when you are ready, or use the button below.</p>
              ) : (
                <div className="runner-countdown">
                  <strong>{roundedSeconds(state.exerciseTimeRemainingSeconds)}</strong>
                  <span>seconds remaining</span>
                  <p>{state.paused ? "Programme paused." : "Continue exercising."}</p>
                </div>
              )}
            </ExerciseCard>
          )}

          {(state.phase === "resting" || state.phase === "set-complete") && (
            <div className="runner-message runner-rest">
              <h3>{state.phase === "set-complete" ? `Set ${state.currentSetIndex + 1} complete.` : "Exercise complete."}</h3>
              <p>Next: Set {nextSetIndex + 1} of {totalSets}, Exercise {nextExerciseIndex + 1} of {exerciseCount}</p>
              {nextExercise && <strong>{nextExercise.name}</strong>}
              <p>Rest for up to {roundedSeconds(state.restTimeRemainingSeconds)} seconds.</p>
              <p>Raise your right arm when ready to continue.</p>
              <button className="button button--primary" type="button" onClick={runner.beginExercise}>
                CONTINUE NOW
              </button>
            </div>
          )}

          <div className="gesture-indicator">
            <span>Right-arm ready gesture</span>
            <strong>{GESTURE_LABELS[runner.gestureStatus]}</strong>
            <dl className="gesture-diagnostics">
              <div><dt>right wrist y</dt><dd>{runner.gestureDiagnostics.rightWristY?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>right shoulder y</dt><dd>{runner.gestureDiagnostics.rightShoulderY?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>wristAboveShoulder</dt><dd>{runner.gestureDiagnostics.wristAboveShoulder ? "yes" : "no"}</dd></div>
              <div><dt>poseQuality</dt><dd>{runner.gestureDiagnostics.poseQuality}</dd></div>
              <div><dt>gesture armed</dt><dd>{runner.gestureDiagnostics.armed ? "yes" : "no"}</dd></div>
              <div><dt>dwell elapsed</dt><dd>{Math.round(runner.gestureDiagnostics.dwellElapsedMs)} ms</dd></div>
              <div><dt>dwell required</dt><dd>{runner.gestureDiagnostics.dwellRequiredMs} ms</dd></div>
              <div><dt>trigger count</dt><dd>{runner.gestureDiagnostics.triggerCount}</dd></div>
            </dl>
          </div>

          <div className="runner-development-controls">
            <span>Development controls</span>
            {!state.paused ? (
              <button className="button button--secondary" type="button" onClick={runner.pause} disabled={state.phase === "ready"}>Pause programme</button>
            ) : (
              <button className="button button--secondary" type="button" onClick={runner.resume}>Resume</button>
            )}
            <button className="button button--secondary" type="button" onClick={runner.restartExercise}>Restart current exercise</button>
            <button className="button button--secondary" type="button" onClick={runner.skip}>Skip to next exercise — DEVELOPMENT ONLY</button>
          </div>
        </>
      )}

      {state.phase === "programme-complete" && (
        <div className="runner-message runner-complete">
          <h3>Programme complete.</h3>
          <p>Exercises completed: {exerciseCount * totalSets}</p>
          <p>Sets completed: {totalSets}</p>
          <div>
            <button className="button button--secondary" type="button" onClick={runner.returnToProgramme}>RETURN TO PROGRAMME</button>
            <button className="button button--primary" type="button" onClick={runner.startAgain}>START AGAIN</button>
          </div>
        </div>
      )}
    </section>
  );
}

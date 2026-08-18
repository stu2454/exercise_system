import type { ReactNode } from "react";
import type { Exercise, ExercisePrescription } from "../exercise/types";
import { exerciseInstruction, restInstruction, setProgressInstruction } from "../exercise/instructions";
import { ReferenceVideo } from "./ReferenceVideo";

interface ExerciseCardProps {
  exercise: Exercise;
  prescription: ExercisePrescription;
  onStart?: () => void;
  startLabel?: string;
  startDisabled?: boolean;
  videoActive?: boolean;
  currentSetNumber?: number;
  children?: ReactNode;
}

export function ExerciseCard({
  exercise,
  prescription,
  onStart,
  startLabel = "START EXERCISE",
  startDisabled = false,
  videoActive = false,
  currentSetNumber = 1,
  children,
}: ExerciseCardProps) {
  const instruction = exerciseInstruction(exercise, prescription);
  const rest = restInstruction(prescription.restAfterSeconds);
  const setCount = prescription.sets ?? 1;
  const betweenSetsRest = restInstruction(prescription.restBetweenSetsSeconds);

  return (
    <article className="exercise-card">
      <p className="eyebrow">Participant exercise card</p>
      <h3>{exercise.name}</h3>
      <p className="exercise-card__instruction">{instruction ?? "The prescribed dose is invalid."}</p>
      {setCount > 1 && <p className="exercise-card__set">{setProgressInstruction(currentSetNumber, setCount)}</p>}
      <ReferenceVideo
        src={exercise.referenceVideo}
        title={exercise.name}
        active={videoActive}
        loop={videoActive}
        muted={videoActive}
        showControls={!videoActive}
      />
      {children}
      {onStart && (
        <button className="button button--primary" type="button" disabled={startDisabled} onClick={onStart}>
          {startLabel}
        </button>
      )}
      {rest && <p className="exercise-card__rest">After completion: {rest}</p>}
      {setCount > 1 && betweenSetsRest && <p className="exercise-card__rest">Between sets: {betweenSetsRest}</p>}
    </article>
  );
}

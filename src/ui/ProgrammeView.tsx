import { exerciseInstruction, restInstruction } from "../exercise/instructions";
import type { Exercise, ExerciseProgramme } from "../exercise/types";
import { findExerciseById } from "../exercise/validation";

interface ProgrammeViewProps {
  programme: ExerciseProgramme;
  exercises: readonly Exercise[];
}

export function ProgrammeView({ programme, exercises }: ProgrammeViewProps) {
  return (
    <section className="development-section programme-view">
      <p className="eyebrow">Build 6 · Development programme</p>
      <h2>{programme.name}</h2>
      {programme.description && <p>{programme.description}</p>}
      <p>Complete all {programme.exercises.length} exercises once, then begin the next set.</p>
      <ol>
        {programme.exercises.map((prescription, index) => {
          const exercise = findExerciseById(exercises, prescription.exerciseId);
          if (!exercise) {
            return <li className="programme-error" key={`${prescription.exerciseId}-${index}`}>Missing exercise: {prescription.exerciseId}</li>;
          }
          return (
            <li key={`${prescription.exerciseId}-${index}`}>
              <strong>{exercise.name}</strong>
              <span>{exerciseInstruction(exercise, prescription) ?? "Invalid prescription."}</span>
              {prescription.restBetweenSetsSeconds !== undefined && <small>Transition: {restInstruction(prescription.restBetweenSetsSeconds)}</small>}
              {prescription.restAfterSeconds !== undefined && <small>{restInstruction(prescription.restAfterSeconds)}</small>}
            </li>
          );
        })}
      </ol>
    </section>
  );
}

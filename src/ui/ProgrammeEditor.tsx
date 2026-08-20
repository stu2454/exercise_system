import { useMemo, useState } from "react";
import type { Exercise, ExerciseDoseType, ExerciseProgramme } from "../exercise/types";
import type { ProgrammeCollection } from "../programme/programmeStorage";
import {
  addExerciseToProgramme,
  changePrescriptionDoseType,
  moveProgrammeExercise,
  removeExerciseFromProgramme,
  searchExerciseLibrary,
  updateCircuitSetCount,
  updateProgrammePrescription,
} from "../programme/programmeEditor";

interface ProgrammeEditorProps {
  collection: ProgrammeCollection;
  activeProgramme: ExerciseProgramme;
  exercises: readonly Exercise[];
  onCreate: (programme: ExerciseProgramme) => void;
  onUpdate: (programme: ExerciseProgramme) => void;
  onDelete: (programmeId: string) => void;
  onSelect: (programmeId: string) => void;
}

function positiveInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function nonNegativeInteger(value: string): number | null {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
}

function newProgrammeId(): string {
  return `programme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function ProgrammeEditor({ collection, activeProgramme, exercises, onCreate, onUpdate, onDelete, onSelect }: ProgrammeEditorProps) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => searchExerciseLibrary(exercises, query), [exercises, query]);
  const included = new Set(activeProgramme.exercises.map((item) => item.exerciseId));
  const circuitSets = activeProgramme.exercises[0]?.sets ?? 1;
  const update = (programme: ExerciseProgramme) => onUpdate(programme);

  const create = () => {
    const suffix = collection.programmes.length + 1;
    onCreate({
      id: newProgrammeId(),
      name: `Programme ${suffix}`,
      description: "Locally configured development programme; not clinically validated.",
      exercises: activeProgramme.exercises.map((item) => ({ ...item, dose: { ...item.dose } })),
    });
  };

  return (
    <section className="development-section programme-editor">
      <div className="development-section__heading">
        <p className="eyebrow">Build 6 · Programme editor</p>
        <h2>Configure programmes</h2>
        <p>Programme prescriptions are local development configuration and are not clinically validated.</p>
      </div>

      <div className="programme-editor__toolbar">
        <label>Active programme
          <select value={activeProgramme.id} onChange={(event) => onSelect(event.target.value)}>
            {collection.programmes.map((programme) => <option value={programme.id} key={programme.id}>{programme.name}</option>)}
          </select>
        </label>
        <button className="button button--secondary" type="button" onClick={create}>Create programme</button>
        <button className="button button--secondary" type="button" disabled={collection.programmes.length <= 1} onClick={() => onDelete(activeProgramme.id)}>Delete programme</button>
      </div>

      <div className="programme-editor__identity">
        <label>Programme name
          <input value={activeProgramme.name} onChange={(event) => update({ ...activeProgramme, name: event.target.value || "Untitled programme" })} />
        </label>
        <label>Programme description
          <input value={activeProgramme.description ?? ""} onChange={(event) => update({ ...activeProgramme, description: event.target.value })} />
        </label>
        <label>Number of circuit sets
          <input type="number" min="1" value={circuitSets} onChange={(event) => {
            const sets = positiveInteger(event.target.value);
            if (sets !== null) update(updateCircuitSetCount(activeProgramme, sets));
          }} />
        </label>
      </div>

      <div className="programme-editor__columns">
        <section className="programme-editor__library">
          <h3>Available Exercise Library</h3>
          <label>Search exercises
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Exercise name or tag" />
          </label>
          <div className="programme-editor__library-list">
            {matches.map((exercise) => (
              <div className="programme-editor__library-row" key={exercise.id}>
                <div><strong>{exercise.name}</strong><small>{exercise.category}</small></div>
                <button className="button button--secondary" type="button" disabled={included.has(exercise.id)} onClick={() => update(addExerciseToProgramme(activeProgramme, exercise))}>{included.has(exercise.id) ? "Added" : "Add"}</button>
              </div>
            ))}
          </div>
        </section>

        <section className="programme-editor__current">
          <h3>Current Programme</h3>
          <ol>
            {activeProgramme.exercises.map((prescription, index) => {
              const exercise = exercises.find((item) => item.id === prescription.exerciseId);
              const doseType = (prescription.doseType ?? exercise?.doseType ?? "duration") as ExerciseDoseType;
              return (
                <li className="programme-editor__exercise" key={`${prescription.exerciseId}-${index}`}>
                  <div className="programme-editor__exercise-heading">
                    <strong>{index + 1}. {exercise?.name ?? prescription.exerciseId}</strong>
                    <div>
                      <button type="button" aria-label={`Move ${exercise?.name} up`} disabled={index === 0} onClick={() => update(moveProgrammeExercise(activeProgramme, index, -1))}>↑</button>
                      <button type="button" aria-label={`Move ${exercise?.name} down`} disabled={index === activeProgramme.exercises.length - 1} onClick={() => update(moveProgrammeExercise(activeProgramme, index, 1))}>↓</button>
                      <button type="button" disabled={activeProgramme.exercises.length <= 1} onClick={() => update(removeExerciseFromProgramme(activeProgramme, index))}>Remove</button>
                    </div>
                  </div>
                  <div className="programme-editor__prescription">
                    <label>Mode
                      <select value={doseType} onChange={(event) => update(changePrescriptionDoseType(activeProgramme, index, event.target.value as "duration" | "repetitions"))}>
                        <option value="duration">Duration</option>
                        <option value="repetitions">Repetitions</option>
                      </select>
                    </label>
                    {doseType === "repetitions" ? (
                      <label>Repetitions
                        <input type="number" min="1" value={prescription.dose.repetitions ?? 10} onChange={(event) => {
                          const repetitions = positiveInteger(event.target.value);
                          if (repetitions !== null) update(updateProgrammePrescription(activeProgramme, index, { dose: { repetitions } }));
                        }} />
                      </label>
                    ) : (
                      <label>Duration (seconds)
                        <input type="number" min="1" value={prescription.dose.durationSeconds ?? 60} onChange={(event) => {
                          const durationSeconds = positiveInteger(event.target.value);
                          if (durationSeconds !== null) update(updateProgrammePrescription(activeProgramme, index, { dose: { durationSeconds } }));
                        }} />
                      </label>
                    )}
                    <label>Rest after exercise (seconds)
                      <input type="number" min="0" value={prescription.restBetweenSetsSeconds ?? 0} onChange={(event) => {
                        const restBetweenSetsSeconds = nonNegativeInteger(event.target.value);
                        if (restBetweenSetsSeconds !== null) update(updateProgrammePrescription(activeProgramme, index, { restBetweenSetsSeconds }));
                      }} />
                    </label>
                    <label className="programme-editor__check"><input type="checkbox" checked={prescription.showDemonstrationBeforeExercise ?? true} onChange={(event) => update(updateProgrammePrescription(activeProgramme, index, { showDemonstrationBeforeExercise: event.target.checked }))} /> Show demonstration before exercise</label>
                    <label className="programme-editor__check"><input type="checkbox" checked={prescription.showDemonstrationBetweenSets ?? false} onChange={(event) => update(updateProgrammePrescription(activeProgramme, index, { showDemonstrationBetweenSets: event.target.checked }))} /> Show demonstration between sets</label>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </section>
  );
}

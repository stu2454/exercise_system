import { useMemo, useState } from "react";
import { searchExerciseLibraryItems } from "../exercise/exerciseLibrarySearch";
import type { Exercise } from "../exercise/types";
import { referenceVideoFilename } from "../exercise/videoAssets";
import { ReferenceVideo } from "./ReferenceVideo";

export function ExerciseLibraryView({ exercises }: { exercises: readonly Exercise[] }) {
  const [query, setQuery] = useState("");
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const matches = useMemo(() => searchExerciseLibraryItems(exercises, query), [exercises, query]);
  const selectedExercise = exercises.find((exercise) => exercise.id === selectedExerciseId) ?? null;

  return (
    <section className="development-section exercise-library-browser">
      <div className="development-section__heading">
        <p className="eyebrow">Build 7 · Exercise Library</p>
        <h2>Reference exercises</h2>
        <p>Browse reusable exercise definitions and open one reference video at a time.</p>
      </div>

      <label className="exercise-library-search">
        Search exercises
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, ID, tag, dose or recognition type" />
      </label>

      {selectedExercise && (
        <aside className="exercise-library-detail" aria-label={`${selectedExercise.name} reference detail`}>
          <div className="exercise-library-detail__heading">
            <div><code>{selectedExercise.id}</code><h3>{selectedExercise.name}</h3></div>
            <button className="button button--secondary" type="button" onClick={() => setSelectedExerciseId(null)}>Close</button>
          </div>
          <ReferenceVideo src={selectedExercise.referenceVideo} title={selectedExercise.name} showControls />
        </aside>
      )}

      <p className="exercise-library-count">{matches.length} of {exercises.length} exercises</p>
      {matches.length === 0 ? <p className="exercise-library-empty">No exercises match this search.</p> : (
        <div className="exercise-library-grid">
          {matches.map((exercise) => {
            const selected = exercise.id === selectedExerciseId;
            return (
              <article className={`library-card${selected ? " library-card--selected" : ""}`} key={exercise.id}>
                <button
                  className="library-card__thumbnail"
                  type="button"
                  aria-label={`View ${exercise.name} reference video`}
                  aria-expanded={selected}
                  onClick={() => setSelectedExerciseId(selected ? null : exercise.id)}
                >
                  <span aria-hidden="true">▶</span>
                  <small>{referenceVideoFilename(exercise.referenceVideo) ?? "No video"}</small>
                </button>
                <div>
                  <code>{exercise.id}</code>
                  <h3>{exercise.name}</h3>
                  <dl>
                    <div><dt>Category</dt><dd>{exercise.category ?? "Uncategorised"}</dd></div>
                    <div><dt>Dose type</dt><dd>{exercise.doseType}</dd></div>
                    <div><dt>Recognition</dt><dd>{exercise.recognition.type}</dd></div>
                  </dl>
                  <button className="button button--secondary" type="button" onClick={() => setSelectedExerciseId(selected ? null : exercise.id)}>{selected ? "Close video" : "View video"}</button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

import type { Exercise } from "../exercise/types";
import { referenceVideoFilename } from "../exercise/videoAssets";
import { ReferenceVideo } from "./ReferenceVideo";

export function ExerciseLibraryView({ exercises }: { exercises: readonly Exercise[] }) {
  return (
    <section className="development-section">
      <div className="development-section__heading">
        <p className="eyebrow">Build 6 · Development exercise library</p>
        <h2>Individual reference exercises</h2>
        <p>Each clip is an independent exercise. Names and doses are temporary development metadata.</p>
      </div>
      <div className="exercise-library-grid">
        {exercises.map((exercise) => (
          <article className="library-card" key={exercise.id}>
            <div>
              <code>{exercise.id}</code>
              <h3>{exercise.name}</h3>
              <dl>
                <div><dt>Dose type</dt><dd>{exercise.doseType}</dd></div>
                <div><dt>Video</dt><dd>{referenceVideoFilename(exercise.referenceVideo) ?? "Missing"}</dd></div>
              </dl>
            </div>
            <ReferenceVideo src={exercise.referenceVideo} title={exercise.name} />
          </article>
        ))}
      </div>
    </section>
  );
}

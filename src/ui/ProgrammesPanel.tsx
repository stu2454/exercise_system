import type { Exercise, ExerciseProgramme } from "../exercise/types";
import type { ProgrammeCollection } from "../programme/programmeStorage";
import { ProgrammeEditor } from "./ProgrammeEditor";
import { ProgrammeView } from "./ProgrammeView";

interface ProgrammesPanelProps {
  collection: ProgrammeCollection;
  activeProgramme: ExerciseProgramme;
  exercises: readonly Exercise[];
  onCreate: (programme: ExerciseProgramme) => void;
  onUpdate: (programme: ExerciseProgramme) => void;
  onDelete: (programmeId: string) => void;
  onSelect: (programmeId: string) => void;
}

/** Presentation-only composition; programme state remains owned above the tab shell. */
export function ProgrammesPanel({
  collection,
  activeProgramme,
  exercises,
  onCreate,
  onUpdate,
  onDelete,
  onSelect,
}: ProgrammesPanelProps) {
  return (
    <div className="programmes-panel">
      <ProgrammeEditor
        collection={collection}
        activeProgramme={activeProgramme}
        exercises={exercises}
        onCreate={onCreate}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onSelect={onSelect}
      />
      <ProgrammeView programme={activeProgramme} exercises={exercises} />
    </div>
  );
}

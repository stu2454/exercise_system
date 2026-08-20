import type { CameraStatus } from "../camera/cameraState";
import type { ExerciseProgramme } from "../exercise/types";

interface OverviewPanelProps {
  programme: ExerciseProgramme;
  cameraStatus: CameraStatus;
  canLaunch: boolean;
  onLaunchParticipantMode: () => void;
}

export function OverviewPanel({ programme, cameraStatus, canLaunch, onLaunchParticipantMode }: OverviewPanelProps) {
  const circuitSets = programme.exercises[0]?.sets ?? 0;
  return (
    <section className="development-section overview-panel">
      <p className="eyebrow">Build 7 · Overview</p>
      <h2>Active programme</h2>
      <strong className="overview-panel__programme">{programme.name}</strong>
      <p>{programme.exercises.length} exercises · {circuitSets} circuit {circuitSets === 1 ? "set" : "sets"}</p>
      <p className="overview-panel__status">Camera: <strong>{cameraStatus}</strong></p>
      <button className="button button--primary" type="button" disabled={!canLaunch} onClick={onLaunchParticipantMode}>
        LAUNCH PARTICIPANT MODE
      </button>
    </section>
  );
}

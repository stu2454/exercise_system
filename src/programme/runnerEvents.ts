export type RepetitionEventSource = "recognition" | "developer";

/** Generic boundary with no MediaPipe or landmark data. */
export interface RepetitionCompletedEvent {
  type: "repetition-completed";
  exerciseId: string;
  timestampMs: number;
  source: RepetitionEventSource;
}

export type ProgrammeRunnerEvent = RepetitionCompletedEvent;

export function isRepetitionCompletedEvent(value: unknown): value is RepetitionCompletedEvent {
  if (typeof value !== "object" || value === null) return false;
  const event = value as Partial<RepetitionCompletedEvent>;
  return event.type === "repetition-completed" &&
    typeof event.exerciseId === "string" && event.exerciseId.trim().length > 0 &&
    typeof event.timestampMs === "number" && Number.isFinite(event.timestampMs) && event.timestampMs >= 0 &&
    (event.source === "recognition" || event.source === "developer");
}

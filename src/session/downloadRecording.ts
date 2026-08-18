import type { CompletedRecording } from "./recording";

export function downloadRecording(recording: CompletedRecording): void {
  const blob = new Blob([recording.jsonl], {
    type: "application/x-ndjson;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = recording.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

import type { ChangeEvent } from "react";
import type { ReplayOutput, DeterminismSummary } from "../session/replayProcessor";
import type { ReplayState } from "../session/replayPlayer";

interface ReplayPanelProps {
  replayMode: boolean;
  recordingName: string | null;
  state: ReplayState;
  output: ReplayOutput | null;
  errorMessage: string | null;
  onImport: (file: File) => void;
  onPlay: () => void;
  onPause: () => void;
  onRestart: () => void;
  onStop: () => void;
}

function formatTime(durationMs: number): string {
  const seconds = Math.max(0, durationMs) / 1000;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}

function ComparisonSummary({ summary }: { summary: DeterminismSummary }) {
  const worstNumericalMismatches = summary.numericalMismatches.slice(0, 10);
  return (
    <div className="replay-comparison">
      <h3>Determinism comparison</h3>
      <dl>
        <div><dt>Observations before warm-up</dt><dd>{summary.observationsBeforeWarmup}</dd></div>
        <div><dt>Observations compared</dt><dd>{summary.observationsCompared}</dd></div>
        <div><dt>Quality matches</dt><dd>{summary.qualityMatches} / {summary.qualityComparisons}</dd></div>
        <div><dt>Activity-level matches</dt><dd>{summary.activityLevelMatches} / {summary.activityLevelComparisons}</dd></div>
        {Object.entries(summary.features).map(([name, feature]) => (
          <div key={name}>
            <dt>{name}</dt>
            <dd>
              status {feature.validityStatusMatches} / {feature.statusComparisons};{" "}
              numeric {feature.numericMatchesWithinTolerance} / {feature.validNumericComparisons};{" "}
              max finite Δ {feature.maxFiniteDelta?.toExponential(3) ?? "n/a"};{" "}
              validity mismatches {feature.validityMismatches};{" "}
              non-finite errors {feature.nonFiniteValueErrors}
            </dd>
          </div>
        ))}
      </dl>
      {summary.activityLevelMismatches.length > 0 && (
        <>
          <h4>Activity-level mismatches</h4>
          <ul>
            {summary.activityLevelMismatches.map((item) => (
              <li key={`${item.observationIndex}-${item.timestampMs}`}>
                #{item.observationIndex} at {item.timestampMs.toFixed(1)} ms:{" "}
                {item.originalActivityLevel ?? "invalid"} → {item.replayActivityLevel ?? "invalid"};{" "}
                whole-body {String(item.originalWholeBodyActivity.value)} ({item.originalWholeBodyActivity.valid ? "valid" : "invalid"}) →{" "}
                {String(item.replayWholeBodyActivity.value)} ({item.replayWholeBodyActivity.valid ? "valid" : "invalid"});{" "}
                quality {item.originalPoseQuality ?? "missing"} → {item.replayPoseQuality}; context:{" "}
                {Object.entries(item.context).filter(([, value]) => value).map(([name]) => name).join(", ") || "none"}
              </li>
            ))}
          </ul>
        </>
      )}
      {worstNumericalMismatches.length > 0 && (
        <>
          <h4>Worst numerical mismatches (top 10)</h4>
          <table>
            <thead><tr><th>Index</th><th>Timestamp</th><th>Feature</th><th>Original</th><th>Replay</th><th>Absolute Δ</th></tr></thead>
            <tbody>
              {worstNumericalMismatches.map((item) => (
                <tr key={`${item.observationIndex}-${item.feature}`}>
                  <td>{item.observationIndex}</td>
                  <td>{item.timestampMs.toFixed(1)}</td>
                  <td>{item.feature}</td>
                  <td>{item.originalValue.toPrecision(8)}</td>
                  <td>{item.replayValue.toPrecision(8)}</td>
                  <td>{item.absoluteDelta.toExponential(3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

export function ReplayPanel({
  replayMode,
  recordingName,
  state,
  output,
  errorMessage,
  onImport,
  onPlay,
  onPause,
  onRestart,
  onStop,
}: ReplayPanelProps) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onImport(file);
    event.target.value = "";
  };

  return (
    <section className={`replay-panel${replayMode ? " replay-panel--active" : ""}`}>
      <div className="replay-panel__header">
        <div>
          <p className="eyebrow">Build 5 · Record / Replay / Regression</p>
          <h2>{replayMode ? "REPLAY MODE" : "Import recording"}</h2>
          <p>{recordingName ?? "Load a schema 2.0.0 JSONL recording."}</p>
        </div>
        <label className="button button--secondary import-button">
          Import recording
          <input type="file" accept=".jsonl,.ndjson,application/x-ndjson" onChange={handleFile} />
        </label>
      </div>

      {errorMessage && <p className="replay-error" role="alert">{errorMessage}</p>}

      {replayMode && (
        <>
          <div className="replay-controls">
            <button className="button button--primary" type="button" onClick={onPlay} disabled={state.status === "playing"}>Play</button>
            <button className="button button--secondary" type="button" onClick={onPause} disabled={state.status !== "playing"}>Pause</button>
            <button className="button button--secondary" type="button" onClick={onRestart}>Restart</button>
            <button className="button button--secondary" type="button" onClick={onStop}>Stop replay</button>
            <strong>{state.status.toUpperCase()}</strong>
          </div>
          <div className="replay-progress">
            <progress value={state.progress} max={1} />
            <span>{formatTime(state.elapsedMs)} / {formatTime(state.totalDurationMs)}</span>
            <small>{state.processedObservations} / {state.totalObservations} observations</small>
          </div>
          {output && (
            <div className="replay-live">
              <div><span>Pose quality</span><strong>{output.poseQuality.level.toUpperCase()}</strong></div>
              <div><span>Person present</span><strong>{output.poseQuality.personPresent ? "YES" : "NO"}</strong></div>
              <div><span>Whole-body activity</span><strong>{output.movementFeatures.wholeBodyActivity.value?.toFixed(3) ?? "INVALID"}</strong></div>
              <div><span>Activity level</span><strong>{output.movementFeatures.activityLevel?.toUpperCase() ?? "INVALID"}</strong></div>
            </div>
          )}
          {state.summary && <ComparisonSummary summary={state.summary} />}
        </>
      )}
    </section>
  );
}

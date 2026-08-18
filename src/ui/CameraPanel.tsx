import type { RefObject } from "react";
import type { CameraState } from "../camera/cameraState";
import type { PoseDisplayState } from "../pose/usePoseLandmarker";
import type { MovementFeatures, FeatureValue } from "../movement/types";
import type { SessionSummary } from "../engagement/types";
import type { CompletedRecording } from "../session/recording";

interface CameraPanelProps {
  cameraState: CameraState;
  poseState: PoseDisplayState;
  movementFeatures: MovementFeatures;
  sessionActive: boolean;
  sessionSummary: SessionSummary | null;
  recordingActive: boolean;
  completedRecording: CompletedRecording | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  showOverlay: boolean;
  onOverlayChange: (visible: boolean) => void;
  onStart: () => void;
  onStop: () => void;
  onStartSession: () => void;
  onStopSession: () => void;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onDownloadRecording: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
}

export function CameraPanel({
  cameraState,
  poseState,
  movementFeatures,
  sessionActive,
  sessionSummary,
  recordingActive,
  completedRecording,
  canvasRef,
  showOverlay,
  onOverlayChange,
  onStart,
  onStop,
  onStartSession,
  onStopSession,
  onStartRecording,
  onStopRecording,
  onDownloadRecording,
  videoRef,
}: CameraPanelProps) {
  const isRequesting = cameraState.status === "requesting";
  const isActive = cameraState.status === "active";
  const isError = cameraState.status === "error";
  const poseIsRunning = poseState.status === "running";

  const detectionLabel = poseIsRunning
    ? poseState.personDetected
      ? "Person detected"
      : "No person detected"
    : poseState.status === "loading"
      ? "Loading pose model…"
      : "Pose detection off";

  const formatCoordinate = (value: number | undefined) =>
    value === undefined ? "—" : value.toFixed(3);

  const rawPoseFrame = poseState.rawPoseFrame;
  const filteredPoseFrame = poseState.filteredPoseFrame;
  const rawLeftWrist = rawPoseFrame?.landmarks.leftWrist;
  const filteredLeftWrist = filteredPoseFrame?.landmarks.leftWrist;
  const movementMetrics: [string, FeatureValue][] = [
    ["Whole body", movementFeatures.wholeBodyActivity],
    ["Upper body", movementFeatures.upperBodyActivity],
    ["Lower body", movementFeatures.lowerBodyActivity],
    ["Trunk", movementFeatures.trunkActivity],
    ["Left arm", movementFeatures.leftUpperLimbActivity],
    ["Right arm", movementFeatures.rightUpperLimbActivity],
    ["Left leg", movementFeatures.leftLowerLimbActivity],
    ["Right leg", movementFeatures.rightLowerLimbActivity],
  ];

  const formatMetric = (feature: FeatureValue) =>
    feature.valid && feature.value !== null ? feature.value.toFixed(3) : "—";
  const formatFraction = (value: number) => `${(value * 100).toFixed(1)}%`;

  return (
    <section className="camera-panel" aria-labelledby="camera-title">
      <div className="camera-copy">
        <p className="eyebrow">Build 5 · Stage 1 data recording</p>
        <h2 id="camera-title">Camera and pose preview</h2>
        <p>
          Camera access starts only when you choose it. Video is never recorded
          or uploaded; developer recording contains pose-derived data only.
        </p>

        <div className="camera-status" role="status" aria-live="polite">
          <span className={`status-dot status-dot--${cameraState.status}`} />
          <div>
            <strong>Status: {cameraState.status}</strong>
            <p className={isError ? "error-message" : undefined}>
              {cameraState.message}
            </p>
          </div>
        </div>

        {isActive && (
          <div className="pose-debug" aria-live="polite">
            <div>
              <span className="debug-label">Pose status</span>
              <strong>{detectionLabel}</strong>
            </div>
            <div>
              <span className="debug-label">Inference</span>
              <strong>{poseState.inferenceFps.toFixed(1)} FPS</strong>
            </div>
            <div>
              <span className="debug-label">Pose quality</span>
              <strong className={`quality-level quality-level--${poseState.poseQuality.level}`}>
                {poseState.poseQuality.level.toUpperCase()}
              </strong>
            </div>
            <div>
              <span className="debug-label">Person detected</span>
              <strong>{poseState.poseQuality.personPresent ? "Yes" : "No"}</strong>
            </div>
            <div>
              <span className="debug-label">Full body visible</span>
              <strong>{poseState.poseQuality.fullBodyVisible ? "Yes" : "No"}</strong>
            </div>
            <label className="overlay-toggle">
              <input
                type="checkbox"
                checked={showOverlay}
                onChange={(event) => onOverlayChange(event.target.checked)}
              />
              Show skeleton
            </label>
            {poseState.errorMessage && (
              <p className="pose-error">{poseState.errorMessage}</p>
            )}
            {poseState.poseQuality.warnings.length > 0 && (
              <div className="quality-warnings">
                <span className="debug-label">Warnings</span>
                <ul>
                  {poseState.poseQuality.warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
              </div>
            )}
            {rawPoseFrame && (
              <div className="canonical-debug">
                <span>Canonical landmark filtering</span>
                <dl>
                  <div>
                    <dt>timestampMs</dt>
                    <dd>{rawPoseFrame.timestampMs.toFixed(1)}</dd>
                  </div>
                  <div>
                    <dt>personConfidence</dt>
                    <dd>{rawPoseFrame.personConfidence.toFixed(3)}</dd>
                  </div>
                  <div>
                    <dt>raw leftWrist x/y</dt>
                    <dd>
                      {formatCoordinate(rawLeftWrist?.x)} /{" "}
                      {formatCoordinate(rawLeftWrist?.y)}
                    </dd>
                  </div>
                  <div>
                    <dt>filtered leftWrist x/y</dt>
                    <dd>
                      {formatCoordinate(filteredLeftWrist?.x)} /{" "}
                      {formatCoordinate(filteredLeftWrist?.y)}
                    </dd>
                  </div>
                </dl>
              </div>
            )}
            <div className="movement-debug">
              <div className="movement-heading">
                <span className="debug-label">Movement features</span>
                <strong>
                  {movementFeatures.activityLevel?.toUpperCase() ?? "UNAVAILABLE"}
                </strong>
              </div>
              <div className="activity-bar" aria-hidden="true">
                <span
                  style={{
                    transform: `scaleX(${movementFeatures.wholeBodyActivity.value === null
                      ? 0
                      : movementFeatures.wholeBodyActivity.value /
                        (1 + movementFeatures.wholeBodyActivity.value)})`,
                  }}
                />
              </div>
              <dl className="movement-metrics">
                {movementMetrics.map(([label, feature]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{formatMetric(feature)}</dd>
                    <span className={feature.valid ? "metric-valid" : "metric-invalid"}>
                      {feature.valid ? "VALID" : "INVALID"}
                    </span>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

        <div className="camera-actions">
          <button
            className="button button--primary"
            type="button"
            onClick={onStart}
            disabled={isRequesting || isActive}
          >
            {isRequesting ? "Requesting permission…" : "Start camera"}
          </button>
          <button
            className="button button--secondary"
            type="button"
            onClick={onStop}
            disabled={!isRequesting && !isActive}
          >
            Stop camera
          </button>
        </div>

        {isActive && (
          <div className="session-controls">
            <button
              className="button button--primary"
              type="button"
              onClick={onStartSession}
              disabled={sessionActive || !poseIsRunning}
            >
              Start session
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={onStopSession}
              disabled={!sessionActive}
            >
              Stop session
            </button>
            <strong>{sessionActive ? "Session running" : "Session stopped"}</strong>
          </div>
        )}

        <div className={`recording-controls${recordingActive ? " recording-controls--active" : ""}`}>
          <div className="recording-status" role="status" aria-live="polite">
            <span className="recording-dot" />
            <div>
              <strong>{recordingActive ? "RECORDING DATA" : "Recording off"}</strong>
              <small>Canonical pose, quality, and movement features only</small>
            </div>
          </div>
          <div className="recording-actions">
            <button
              className="button button--primary"
              type="button"
              onClick={onStartRecording}
              disabled={!isActive || !poseIsRunning || recordingActive}
            >
              Start recording
            </button>
            <button
              className="button button--secondary"
              type="button"
              onClick={onStopRecording}
              disabled={!recordingActive}
            >
              Stop recording
            </button>
            {completedRecording && !recordingActive && (
              <button
                className="button button--secondary"
                type="button"
                onClick={onDownloadRecording}
              >
                Download JSONL ({completedRecording.recordCount} records)
              </button>
            )}
          </div>
        </div>

        {sessionSummary && (
          <section className="session-summary" aria-labelledby="session-summary-title">
            <h3 id="session-summary-title">Session summary</h3>
            <dl>
              <div><dt>Duration</dt><dd>{(sessionSummary.durationMs / 1000).toFixed(1)} s</dd></div>
              <div><dt>Valid observation</dt><dd>{formatFraction(sessionSummary.validObservationFraction)}</dd></div>
              <div><dt>Visible</dt><dd>{formatFraction(sessionSummary.visibleFraction)}</dd></div>
              <div><dt>Active</dt><dd>{formatFraction(sessionSummary.activeFraction)}</dd></div>
              <div><dt>Mean whole body</dt><dd>{sessionSummary.wholeBodyActivityMean?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>Mean upper body</dt><dd>{sessionSummary.upperBodyActivityMean?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>Mean lower body</dt><dd>{sessionSummary.lowerBodyActivityMean?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>Mean trunk</dt><dd>{sessionSummary.trunkActivityMean?.toFixed(3) ?? "—"}</dd></div>
              <div><dt>Longest inactive</dt><dd>{sessionSummary.longestInactiveIntervalMs === null ? "—" : `${(sessionSummary.longestInactiveIntervalMs / 1000).toFixed(1)} s`}</dd></div>
            </dl>
          </section>
        )}
      </div>

      <div className={`camera-preview${isActive ? " camera-preview--active" : ""}`}>
        <video ref={videoRef} autoPlay muted playsInline aria-label="Live camera preview" />
        <canvas ref={canvasRef} className="pose-overlay" aria-hidden="true" />
        {!isActive && (
          <div className="camera-placeholder" aria-hidden="true">
            <span>Camera preview</span>
            <small>Off until you start it</small>
          </div>
        )}
      </div>
    </section>
  );
}

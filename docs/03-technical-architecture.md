# 03 — Technical Architecture

## Architectural objective

Build a browser-native experimental platform where camera acquisition, pose estimation, movement features and engagement interpretation can evolve independently.

## Pipeline

```text
┌─────────────────────┐
│ Webcam / Video File │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Frame Source        │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ MediaPipe Adapter   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Canonical PoseFrame │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Quality + Filtering │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Movement Features   │
└──────────┬──────────┘
           ↓
┌─────────────────────┐
│ Engagement Engine   │
└──────┬───────┬──────┘
       ↓       ↓
      UI     Recorder
```

## Module boundaries

### `src/camera`

Responsibilities:

- request/release webcam;
- enumerate camera devices later if required;
- expose frames/timestamps;
- manage camera-facing presentation concerns.

Must not calculate movement features.

### `src/pose`

Responsibilities:

- initialise MediaPipe;
- convert MediaPipe output into canonical structures;
- pose quality;
- pose-level normalisation.

MediaPipe-specific indices remain here.

### `src/movement`

Responsibilities:

- geometry;
- joint angles;
- temporal filtering;
- landmark velocity;
- movement-energy calculations;
- regional activity.

Prefer pure functions.

### `src/reference`

Responsibilities:

- ingest reference video;
- generate or load reference pose streams;
- segment reference movement later;
- synchronise reference and participant timelines.

### `src/engagement`

Responsibilities:

- participation;
- persistence;
- responsiveness;
- similarity;
- eventual transparent composite metrics.

Must consume canonical features, not MediaPipe objects.

### `src/session`

Responsibilities:

- session lifecycle;
- frame/feature recording;
- JSON export;
- replay abstraction.

### `src/ui`

Responsibilities:

- React components;
- framing feedback;
- metrics display;
- session controls.

No scoring algorithms.

## Browser processing

For the first prototype:

- pose estimation occurs locally;
- no backend is required;
- exercise/reference video may be local/static;
- session metrics can remain in memory;
- optional pose-stream export is user initiated.

## Performance

Pose inference can be computationally expensive.

Do not require inference on every camera frame.

Potential pipeline:

```text
camera ~30 fps
pose inference 10–30 fps depending on device
UI render independent where practical
```

Measure actual throughput before optimising.

## Worker architecture

Do not introduce Web Workers in Build 0.

If pose inference blocks the UI measurably, move inference to a worker in a later ADR.

## Storage

Prototype preference:

1. in-memory session state;
2. downloadable JSON/JSONL;
3. IndexedDB when persistent local sessions become useful.

Do not add a cloud database before there is a concrete multi-user need.

## Reference-video strategy

Reference videos should eventually have a precomputed pose artefact:

```text
exercise.mp4
exercise.pose.jsonl
exercise.metadata.json
```

This avoids repeatedly running pose inference on unchanged reference content.

## Time base

Use monotonic elapsed time for session calculations.

Canonical frame timestamps are milliseconds from the source/session time base.

Never infer velocity from camera-reported FPS alone if actual timestamps are available.

## Error handling

Distinguish:

- camera unavailable;
- permission denied;
- pose model unavailable;
- no person detected;
- incomplete framing;
- low-confidence tracking;
- internal calculation failure.

Do not report tracking failure as participant inactivity.

## Future backend

Deferred.

Potential future needs:

- authentication;
- clinician dashboards;
- exercise libraries;
- longitudinal results;
- remote configuration;
- consent/audit.

These are intentionally excluded from the technical prototype.

# 08 — Reuse from `vision-exercise-system`

## Purpose

Document what is inherited conceptually from the earlier repository and what is intentionally new.

Reference repository:

`stu2454/vision-exercise-system`

## Reuse directly as design principles

### Canonical pose abstraction
Keep pose-provider details behind an adapter.

### Pose-quality layer
Downstream interpretation must know whether the observation itself is adequate.

### Temporal processing
Do not interpret noisy raw frame-by-frame coordinates without filtering/temporal context.

### Movement features
Derive reusable physical/movement quantities before exercise/product logic.

### Record/replay
Canonical streams should be replayable without rerunning pose inference.

### Regression harness
Algorithm changes should be tested against fixed examples.

### Privacy
Raw participant video is an explicit development artefact, not the default data record.

## Translate rather than copy

| Earlier system | New system |
|---|---|
| Python dataclass | TypeScript interface |
| OpenCV camera | browser MediaDevices |
| Python MediaPipe | MediaPipe Tasks Vision JS |
| local window overlay | React/canvas overlay |
| JSONL pose recording | JSONL/browser export |
| SQLite | no database initially |
| exercise state machine | engagement components |
| STS repetitions | activity/persistence/similarity |

## Do not import legacy assumptions accidentally

The new project should not assume:

- a repetition-based exercise;
- frontal camera only;
- sit-to-stand calibration;
- Python-specific module structure;
- Raspberry Pi deployment;
- local desktop application;
- one exercise state machine per activity.

## Possible future shared package

Only consider extracting a cross-project specification after the TypeScript architecture has stabilised.

A premature shared library would create coupling without meaningful code reuse because the runtimes differ.

A more plausible shared artefact is a **language-neutral schema**, for example:

- canonical landmark names;
- PoseFrame JSON schema;
- pose-quality vocabulary;
- test fixture format.

That could permit pose recordings or validation data to move between the Python and browser projects later.

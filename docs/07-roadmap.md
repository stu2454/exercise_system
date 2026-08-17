# 07 — Roadmap

## Phase A — Browser measurement foundation

### Build 0
React/Vite shell and webcam.

### Build 1
MediaPipe Pose Landmarker.

### Build 2
Canonical pose adapter.

### Build 3
Pose quality and temporal filtering.

### Build 4
Participant-only movement activity.

**Decision gate:** Are active vs inactive and regional-activity measures stable enough to be useful?

## Phase B — Reproducible experimentation

### Build 5
Pose record/replay and regression harness.

Create a small labelled dataset.

**Decision gate:** Do metrics behave consistently across repeated processing and modest camera variation?

## Phase C — Reference exercise

### Build 6
Precompute pose/features from a reference exercise video.

### Build 7
Synchronise participant and reference streams.

### Build 8
Explore responsiveness and movement similarity.

Start with interpretable trajectories. Do not jump straight to a learned classifier.

**Decision gate:** Does reference matching add meaningful information beyond participant-only activity?

## Phase D — Usable demonstrator

### Build 9
Session dashboard and export.

### Build 10
Exercise library metadata.

### Build 11
Simple session history.

Only now consider:

- deployment;
- remote studies;
- user accounts;
- backend storage.

## Phase E — Evaluation

Questions:

- test-retest reliability;
- sensitivity to true changes in participation;
- robustness to camera placement;
- robustness across participants;
- relationship between engagement measures and human ratings;
- usability for older adults;
- accessibility;
- privacy acceptability.

## Deferred product possibilities

These are hypotheses, not current scope:

- home rehabilitation;
- restorative care;
- falls-prevention programmes;
- remote clinician review;
- exercise adherence monitoring;
- adaptive exercise content;
- functional movement assessment.

Each requires its own validation and regulatory/product assessment.

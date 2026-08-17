# CLAUDE.md — Exercise Engagement

## Project purpose

This repository is a browser-based experimental system for measuring engagement in video-delivered exercise using a commodity RGB camera and pose estimation.

The immediate goal is not a complete rehabilitation platform. The first goal is to establish whether interpretable, privacy-preserving pose-derived measures can distinguish:

- participant present vs absent;
- still vs active;
- low vs high whole-body movement;
- upper-, lower- and trunk-body participation;
- sustained vs intermittent participation;
- eventually, participant movement related to a reference exercise vs unrelated movement.

## Read first

Before making material changes, read:

- `docs/01-project-vision.md`
- `docs/02-engagement-model.md`
- `docs/03-technical-architecture.md`
- `docs/04-data-contracts.md`
- `docs/05-mvp-specification.md`
- `docs/06-validation-and-testing.md`
- `docs/07-roadmap.md`

These are the project source of truth.

## Core architectural rule

Separate sensing from movement interpretation, and movement interpretation from product behaviour.

Pipeline:

```text
CAMERA / VIDEO / REPLAY
          ↓
      POSE ENGINE
          ↓
 CANONICAL POSE ADAPTER
          ↓
POSE QUALITY + FILTERING
          ↓
  MOVEMENT FEATURES
          ↓
ENGAGEMENT COMPONENTS
          ↓
       EVENTS
      ↙  ↓  ↘
    UI EXPORT STORAGE
```

Dependencies point down the stack.

### Forbidden coupling

Engagement modules must not:

- open the webcam;
- call MediaPipe directly;
- manipulate React components;
- write browser storage directly;
- depend on raw HTML video elements.

UI modules must not implement movement-scoring logic.

MediaPipe-specific landmark indices and objects must not escape the MediaPipe adapter.

## Technology choices

Unless explicitly changed in an ADR:

- React + TypeScript + Vite
- MediaPipe Pose Landmarker
- browser `getUserMedia`
- local processing by default
- canonical pose data in TypeScript interfaces
- Vitest for tests
- raw participant video off by default
- JSON/JSONL for portable debug and replay artefacts

## Scientific/measurement principles

1. Do not equate reduced range of motion with poor engagement.
2. Do not collapse several uncertain quantities into one apparently precise score.
3. Every derived metric should expose validity/confidence where practical.
4. Pose quality must gate downstream interpretation.
5. Prefer participant-relative or body-normalised features over raw pixels.
6. Retain enough intermediate data to explain why a session metric was produced.
7. Treat reference matching as a later layer, not a prerequisite for basic participation metrics.
8. Avoid clinical claims until independently validated.
9. Prefer conservative language: "movement similarity", not "correctness".
10. A false claim of non-engagement caused by tracking failure is a design defect.

## Build sequence

Do not skip builds unless explicitly asked.

- Build 0: shell + webcam
- Build 1: pose engine
- Build 2: canonical PoseFrame
- Build 3: quality + filtering
- Build 4: activity metrics
- Build 5: record/replay + regression
- Build 6: reference pose extraction
- Build 7: synchronisation
- Build 8: similarity/responsiveness
- Build 9: dashboard/export

## Coding expectations

- Keep functions small and typed.
- Prefer pure functions for geometry, filtering and feature extraction.
- Add unit tests for mathematical transformations.
- Use explicit units in names where ambiguity exists: `timestampMs`, `velocityPerSecond`.
- Avoid magic thresholds; centralise tunable parameters.
- Do not add production dependencies without a clear reason.
- Run `npm test` and `npm run build` after material code changes.
- Do not commit participant video or personally identifying recordings.
- Keep experimental thresholds versioned and documented.

## When uncertain

Do not invent clinical meaning.

Create the smallest technically testable implementation and document the assumption in `docs/decisions/` or the relevant project document.


## Claude Code workflow

At the start of a substantial task:

1. inspect the relevant source and project documents;
2. state the files you intend to change;
3. make the smallest coherent change;
4. run tests/build;
5. report changed files, test outcome and unresolved assumptions.

Do not rewrite project documents merely to make them agree with an implementation. If implementation and specification conflict, flag the conflict.

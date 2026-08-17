# Exercise Engagement

A browser-based experimental system for measuring engagement in video-delivered exercise using a commodity RGB camera and pose estimation.

## Purpose

The first question is deliberately narrow:

> Can an ordinary webcam and browser-based pose estimation provide useful, interpretable measures of whether a participant is actively engaging with a video-delivered exercise session?

This project is **not** initially intended to diagnose impairment, assess clinical correctness, prescribe exercise, or replace clinician judgement.

## Relationship to `vision-exercise-system`

This is a new and independent codebase.

It reuses architectural lessons from the earlier `vision-exercise-system` project, especially:

- canonical pose representation;
- separation of sensing from interpretation;
- pose-quality assessment;
- temporal filtering;
- derived movement features;
- record/replay;
- deterministic regression testing;
- explicit separation of measurement from product behaviour.

It intentionally does **not** inherit:

- the Python/OpenCV runtime;
- exercise-specific state machines as the default recognition model;
- SQLite;
- Raspberry Pi assumptions;
- sit-to-stand as the organising exercise.

## Initial stack

- React
- TypeScript
- Vite
- MediaPipe Pose Landmarker
- browser `getUserMedia`
- local processing by default
- IndexedDB/local JSON for prototype persistence
- Vitest for unit tests

## First builds

1. **Build 0 — Application shell and webcam**
2. **Build 1 — Browser pose estimation**
3. **Build 2 — Canonical PoseFrame**
4. **Build 3 — Pose quality and temporal filtering**
5. **Build 4 — Participant-only activity metrics**
6. **Build 5 — Record/replay and regression harness**
7. **Build 6 — Reference-video pose extraction**
8. **Build 7 — Participant/reference synchronisation**
9. **Build 8 — Similarity and responsiveness**
10. **Build 9 — Session dashboard and export**

Do not jump ahead to a composite engagement score before the component measures have been inspected independently.

## Getting started

```bash
npm install
npm run dev
```

Then open the local URL displayed by Vite.

Before coding, read:

1. `AGENTS.md` or `CLAUDE.md`
2. `docs/01-project-vision.md`
3. `docs/02-engagement-model.md`
4. `docs/03-technical-architecture.md`
5. `docs/05-mvp-specification.md`

## Privacy default

Raw participant video is **not stored by default**.

The preferred data product is a time-stamped stream of canonical body landmarks and derived movement features. Video recording, if added for development, must require an explicit action and must never be committed to Git.

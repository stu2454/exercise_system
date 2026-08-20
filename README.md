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
- in-memory state and downloadable JSONL for prototype persistence
- Vitest for unit tests

## First builds

1. **Build 0 — Application shell and webcam**
2. **Build 1 — Browser pose estimation**
3. **Build 2 — Canonical PoseFrame**
4. **Build 3 — Pose quality and temporal filtering**
5. **Build 4 — Participant-only activity metrics**
6. **Build 5 — Record/replay and regression harness**
7. **Build 6 — Exercise library and programme foundations**
8. **Build 7 — Reference pose extraction and synchronisation foundations**
9. **Build 8 — Similarity and responsiveness**
10. **Build 9 — Session dashboard and export**

Do not jump ahead to a composite engagement score before the component measures have been inspected independently.

## Current implementation

Builds 0–6 are complete through the exercise-library, programme-runner and
participant-mode foundations. The application currently provides:

- explicit webcam lifecycle and single-person MediaPipe pose estimation;
- canonical named pose landmarks, quality assessment and temporal filtering;
- validity-aware whole-body and regional movement activity;
- schema 2.0.0 canonical JSONL recording with explicit no-pose observations;
- deterministic replay and a property-based regression fixture;
- a nine-exercise duration programme with configurable sets and rest;
- full-screen split reference/participant presentation, canonical skeleton,
  framing guidance and an intentional right-arm ready gesture;
- graceful completed/aborted session export;
- semantic participant prompts with optional natural audio and browser voice
  fallback.

Reference pose extraction, participant/reference synchronisation, movement
similarity and responsiveness have not begun.

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

The full 18 August 2026 implementation history and observed validation results
are recorded in
[`docs/development-log/2026-08-18-development-session.md`](docs/development-log/2026-08-18-development-session.md).

## Privacy default

Raw participant video is **not stored by default**.

The preferred data product is a time-stamped stream of canonical body landmarks and derived movement features. Video recording, if added for development, must require an explicit action and must never be committed to Git.

## Client Demo

The Client Demo is the participant-facing, browser-only version intended for
external demonstration. It uses the same exercise library, programme runner,
camera, pose overlay, reference-video behaviour and session-result lifecycle as
the developer application, but runs one pass through the nine current exercises
and does not include developer navigation or tools.

Before the programme, it guides a participant through orientation, space and
camera setup, forgiving positioning feedback, and three tutorial movements:
stand centred, raise both arms, and step sideways and return. This onboarding is
not an assessment and is excluded from programme results.

This is a prototype technology demonstration, not a validated clinical system.
Camera and pose processing remain in the browser; raw camera video is not
recorded or uploaded.

### Run modes

```bash
npm run dev          # full local developer application
npm run dev:demo     # Client Demo locally
npm run build        # developer production build in dist/
npm run build:demo   # static Client Demo build in dist-demo/
npm run preview:demo # preview the built Client Demo
```

For a repository-path Pages deployment, supply the Vite base path, for example:

```bash
npm run build:demo -- --base /exercise_system/
```

### GitHub Pages

`.github/workflows/deploy-client-demo.yml` tests and builds only the static
Client Demo, derives the base path from the repository name, uploads
`dist-demo/`, and deploys it with GitHub Pages Actions. In GitHub, select:

**Repository Settings → Pages → Source → GitHub Actions**

The expected URL is `https://<username>.github.io/<repository-name>/`. See
[`docs/13-client-demo.md`](docs/13-client-demo.md) for full details.

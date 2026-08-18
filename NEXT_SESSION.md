# Next Session

## Current state

Builds 0–6 are implemented and verified through the exercise library,
programme runner, split-screen participant mode, framing guidance, gesture
controls, semantic audio prompts and graceful completed/aborted session export.

The canonical participant pipeline is:

```text
camera → MediaPipe → canonical PoseFrame → quality/filtering
       → movement features → session recording/export
```

Schema 2.0.0 JSONL record/replay preserves explicit `pose: null` observations.
Regression comparison uses a documented 1,000 ms initial-state warm-up and a
staged canonical fixture under `test-data/regression/`.

The detailed development history is in
`docs/development-log/2026-08-18-development-session.md`.

## Before continuing

1. Read `AGENTS.md` or `CLAUDE.md` and all numbered project documents.
2. Run `npm test`, `npm run build` and `git diff --check`.
3. Exercise the participant flow in target browsers, checking camera permission,
   `.mov` playback, fullscreen, voice availability and session download.
4. Do not commit files under `recordings/` or other participant-identifiable
   media.

## Recommended next task

Define and implement Build 7 only: reference pose extraction and explicit
participant/reference time bases.

Before implementation, decide:

- whether reference pose streams are generated ahead of time or in a developer
  extraction workflow;
- the portable reference-pose artefact schema and versioning;
- how reference video time maps to pose timestamps, looping and programme
  intervals;
- how mirrored participant presentation relates to unmirrored anatomical
  reference coordinates;
- how reference artefacts are tested without treating similarity as
  correctness.

Do not add movement similarity, responsiveness or a composite engagement score
until reference extraction and synchronisation are independently testable.

## Known limitations to revisit

- exercise names and prescription remain development placeholders and are not
  clinically validated;
- optional natural prompt audio files are not yet supplied under `public/audio/`;
- `.mov`, fullscreen, SpeechSynthesis and autoplay support vary by browser;
- session data remains volatile until JSONL download;
- current thresholds need broader participant and environment validation.

# 05 — Prototype / MVP Specification

## Prototype objective

Demonstrate that an ordinary laptop webcam can support robust participant-only engagement measurements during a video exercise session.

## Prototype success is NOT

- a polished consumer app;
- clinical validation;
- perfect exercise recognition;
- automated coaching;
- a composite AI score.

## Prototype user journey

1. User opens the app.
2. User sees an explanation that camera processing is local.
3. User grants camera permission.
4. App shows live camera image.
5. App reports whether body framing is adequate.
6. User starts a session.
7. App tracks pose.
8. App displays simple live activity indicators.
9. User ends the session.
10. App shows component measures.
11. Developer can export a pose/feature stream for analysis.

## Build 0 acceptance criteria

- Vite app runs.
- Camera permission can be requested.
- Webcam appears in browser.
- Camera can be stopped cleanly.
- No pose inference.
- No recording.

## Build 1 acceptance criteria

- MediaPipe model loads.
- One participant pose can be estimated.
- Skeleton can be toggled for development.
- Basic inference FPS displayed in developer mode.
- MediaPipe objects do not leak into engagement code.

## Build 2 acceptance criteria

- every pose result maps to `PoseFrame`;
- timestamps are explicit;
- canonical landmark names are used;
- adapter unit tests exist.

## Build 3 acceptance criteria

- pose quality produces good/degraded/insufficient;
- incomplete framing is distinguished from inactivity;
- at least one temporal filter is implemented and tested.

## Build 4 acceptance criteria

Live display:

- person present;
- whole-body movement level;
- upper-body activity;
- lower-body activity;
- active/inactive state.

End-of-session summary:

- visible fraction;
- valid observation fraction;
- active fraction;
- mean regional activity;
- longest inactive interval.

## Build 5 acceptance criteria

- canonical pose stream can be recorded without video;
- stream can be replayed;
- same pose stream yields deterministic feature results;
- regression fixtures support expected properties.

## Build 6 acceptance criteria

- each reference video represents one individual exercise;
- reusable exercises are separate from programme prescriptions;
- repetition, each-side, duration, hold and free doses are representable;
- programmes preserve exercise order and optional rest periods;
- participant-facing instructions are deterministic;
- development views expose the exercise library, programme and native video playback;
- no reference pose extraction or participant comparison is performed yet.

## Builds 7–8

Reference matching begins only after participant-only metrics are stable.

Reference requirements:

- video has pose stream;
- participant/reference time bases are explicit;
- comparison is body-normalised;
- system reports similarity, not correctness.

## UI principle

Prototype UI should make measurement failure obvious.

Good:

```text
Tracking degraded — feet are outside the frame.
```

Bad:

```text
Engagement: 22%
```

when the actual problem is camera framing.

## Privacy

Participant video storage is off by default.

If development video capture is introduced:

- explicit consent/action;
- obvious recording indicator;
- separate from ordinary sessions;
- gitignored;
- documented deletion workflow.

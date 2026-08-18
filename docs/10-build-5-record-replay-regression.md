# Build 5 — Record, replay and regression

## Purpose

Record/replay makes camera-based processing repeatable without retaining raw
participant video or rerunning MediaPipe. The portable input is a schema 2.0.0
stream of canonical `pose-observation` records, including explicit `pose: null`
observations during tracking loss.

Recorded pose-quality and movement-feature records are diagnostic outputs. They
are useful for determinism comparison, but replay recalculates them through the
normal quality, filtering and movement pipeline. Diagnostic records are never
used as replay inputs.

## Initial-condition warm-up

Live processing may already contain filter and movement history when a developer
starts recording. Replay necessarily begins from reset state because that
earlier history is absent from the recording. This can create short-lived
startup differences that decay as temporal state converges.

Regression and replay comparison therefore use a centrally configured default
warm-up of 1,000 ms. Warm-up observations are processed normally and may be
displayed, but are excluded from deterministic pass/fail comparison. This is a
defined initial-condition boundary, not skipped processing and not hidden error.
Fixtures that deliberately begin with empty temporal state can set `warmupMs`
to zero.

## Fixture structure

```text
test-data/
  regression/
    staged-movement-01/
      recording.jsonl
      expectations.json
```

The manifest contains an ID, description, recording filename, warm-up duration,
and relative-time segments. Segment start times are inclusive and end times are
exclusive.

The first real fixture covers stillness, left-arm movement, stepping,
whole-body movement, tracking loss and return. It contains canonical pose and
diagnostic JSONL only; no images or raw video are included.

## Regression expectations

The runner processes every canonical observation through the existing replay
pipeline, creates segment summaries, evaluates manifest checks and returns a
structured result with observed values and failure messages.

Segment summaries report observation count, valid-observation fraction,
pose-quality distribution, regional and whole-body feature means, feature valid
fractions, and activity-level proportions. Invalid feature values are excluded
from means rather than treated as zero.

Fixtures prefer robust properties to fragile exact values, including:

- still is the predominant level in a staged still segment;
- left-arm activity exceeds right-arm activity during a left-arm segment;
- upper-body activity exceeds lower-body activity during arm-only movement;
- stepping lower-body activity exceeds the still baseline;
- combined movement exceeds the whole-body still baseline;
- tracking loss produces insufficient quality and invalid movement features;
- valid observations return after reacquisition.

Exact numerical expectations remain appropriate for low-level unit tests. The
fixture also retains validity-aware deterministic comparison after warm-up using
the documented absolute and relative floating-point tolerance.

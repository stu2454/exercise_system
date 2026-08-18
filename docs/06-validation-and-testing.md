# 06 — Validation and Testing

## Why replay matters

Camera-based algorithms are difficult to develop if every change requires a new live performance.

The system should therefore preserve canonical pose streams so the same movement can be reprocessed deterministically.

## Test layers

### Unit tests

For:

- distances;
- joint angles;
- normalisation;
- velocities;
- filtering;
- activity calculations;
- validity propagation.

### Synthetic pose tests

Create small canonical pose sequences representing:

- stationary participant;
- arm movement only;
- leg movement only;
- whole-body movement;
- tracking gaps;
- impossible landmark jump;
- participant leaving frame.

### Recorded pose regression

Pose streams from real sessions.

The raw video need not be retained once a useful canonical fixture exists, provided debugging needs are met.

Build 5 regression fixtures pair a schema 2.0.0 canonical JSONL recording with
an `expectations.json` manifest. Canonical `pose-observation` records are the
only replay input. Recorded pose-quality and movement-feature records remain
diagnostic comparison data and must never drive recalculated output.

Replay processes every observation. Deterministic pass/fail comparison excludes
the first 1,000 ms by default because a live recording can begin after the live
filter and movement pipeline has accumulated history, while replay begins from
a reset state. This warm-up is an explicit initial-condition boundary, not a
way to hide processing errors. Set `warmupMs` to zero for fixtures captured from
a known empty temporal state.

Prefer behavioural properties over exact values: active movement should exceed
the still baseline, regional activity should reflect staged movement, tracking
loss should produce insufficient quality and invalid features, and valid
observations should recover when the participant returns. Exact numeric
assertions belong in focused mathematical unit tests.

## Ground truth

Avoid defining ground truth solely from the algorithm output.

For activity tests, annotate expected qualitative properties:

```yaml
case: standing_still_01
expected:
  visible: true
  activity: low
  false_active_intervals_max: 1
```

Later:

```yaml
case: exercise_following_01
expected:
  reference_related_movement: true
  response_latency_range_ms: [100, 1500]
```

## Error asymmetry

For some measures, false claims matter more than misses.

Examples:

- tracking loss incorrectly called inactivity;
- ordinary fidgeting incorrectly labelled exercise participation;
- restricted range incorrectly labelled disengagement.

Document the error profile rather than reporting only a single percentage.

## Dataset dimensions to vary

Eventually vary:

- participant;
- body size;
- clothing;
- lighting;
- camera height;
- camera distance;
- frontal vs oblique view;
- background;
- partial occlusion;
- movement amplitude;
- seated vs standing content where relevant.

## Evaluation before composite scoring

Do not validate a composite engagement score first.

Validate the individual measures:

1. presence;
2. pose quality;
3. activity;
4. regional activity;
5. persistence;
6. responsiveness;
7. similarity.

Only then consider aggregation.

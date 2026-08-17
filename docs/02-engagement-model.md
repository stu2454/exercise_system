# 02 — Engagement Measurement Model

## Purpose

This document defines what the system may measure and prevents the project from drifting into an opaque "AI engagement score".

## Principle

Do not begin with a single engagement score.

First generate separate observable components. A composite score, if ever used, must be derived transparently from validated components.

## Level 0 — Observation validity

No engagement metric is meaningful unless observation is adequate.

Candidate measures:

- participant detected proportion;
- full-body visibility proportion;
- landmark confidence;
- pose continuity;
- clipped-body indicators;
- prolonged tracking loss;
- implausible landmark jumps.

Example output:

```json
{
  "observationQuality": "good",
  "personVisibleFraction": 0.97,
  "fullBodyVisibleFraction": 0.92
}
```

## Level 1 — Participation

Question:

> Was the participant present and measurably active?

Candidate variables:

- visible time;
- active time;
- inactive time;
- number and duration of inactive intervals;
- active fraction.

Tentative definition:

```text
activeFrame =
  observationValid
  AND wholeBodyMovementEnergy > activityThreshold
```

Thresholds must be empirically tuned and participant/body-scale normalised where possible.

## Level 2 — Movement activity

Question:

> How much movement was occurring?

Candidate features:

- wrist velocity;
- ankle velocity;
- hip-centre velocity;
- shoulder-centre velocity;
- average landmark velocity;
- weighted whole-body movement energy.

Possible conceptual form:

```text
movementEnergy =
    wHands * wristActivity
  + wFeet  * ankleActivity
  + wTrunk * trunkActivity
  + wCOM   * bodyTranslation
```

Do not commit to weights until inspected against recordings.

## Level 3 — Regional participation

Estimate movement separately for:

- left upper limb;
- right upper limb;
- trunk;
- left lower limb;
- right lower limb.

Session summaries may report:

```text
Upper-body activity: high
Lower-body activity: moderate
Trunk activity: moderate
```

These should be descriptive, not clinical judgements.

## Level 4 — Movement amplitude

Candidate measures:

- shoulder elevation excursion;
- elbow angle excursion;
- hip flexion excursion;
- knee angle excursion;
- ankle displacement relative to body scale;
- trunk inclination excursion;
- body-centre vertical and lateral excursion.

Amplitude should be reported independently of participation.

A participant may have:

```text
Participation: high
Movement amplitude: low
```

That can be an entirely valid pattern.

## Level 5 — Persistence

Candidate measures:

- active fraction;
- longest inactive interval;
- number of drop-outs;
- participation by exercise segment;
- change in activity over time.

Potentially useful for detecting:

- early cessation;
- intermittent participation;
- declining activity across a session.

Do not label these as fatigue without additional evidence.

## Level 6 — Responsiveness

Requires a time-linked reference exercise.

Question:

> Does participant movement change in temporal relation to the demonstration?

Possible variables:

- response latency after a reference movement transition;
- cross-correlation between reference and participant feature trajectories;
- proportion of reference movement epochs with participant response.

## Level 7 — Movement similarity

This is distinct from correctness.

Candidate representations:

1. normalised joint-angle vectors;
2. body-centred landmark coordinates;
3. selected movement-feature vectors;
4. dynamic time warping between trajectories;
5. cosine similarity between normalised feature vectors;
6. cross-correlation after lag compensation.

Initial recommendation:

Start with a small set of interpretable normalised features before comparing all 33 landmarks.

## Reference normalisation

Raw pixel coordinates should not be directly compared across people.

Consider normalising by:

- shoulder width;
- hip width;
- torso length;
- participant bounding-box height;
- body-centred coordinates;
- left/right orientation rules.

Document camera mirroring carefully.

## Composite engagement score

Deferred.

If later introduced, a score might combine:

- valid observation;
- active participation;
- persistence;
- responsiveness;
- similarity.

But it should never penalise restricted range merely because it differs from the demonstrator.

A future score should expose its components:

```json
{
  "engagementScore": 82,
  "components": {
    "participation": 92,
    "persistence": 88,
    "responsiveness": 76,
    "movementSimilarity": 72
  }
}
```

No composite should be implemented before the component metrics have a regression dataset and documented behaviour.

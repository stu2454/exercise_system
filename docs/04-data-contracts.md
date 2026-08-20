# 04 — Data Contracts

## Goal

All interpretation code should consume vendor-neutral, serialisable data.

## Canonical landmark

```ts
export interface Landmark {
  x: number;
  y: number;
  z?: number;
  confidence: number;
}
```

Coordinates should be documented by the adapter. Canonical names are preferred over model-specific indices.

## PoseFrame

```ts
export interface PoseFrame {
  timestampMs: number;
  source: "participant" | "reference" | "replay";
  personConfidence: number;
  landmarks: Partial<Record<LandmarkName, Landmark>>;
}
```

## Landmark names

Initial subset:

```text
nose
leftShoulder
rightShoulder
leftElbow
rightElbow
leftWrist
rightWrist
leftHip
rightHip
leftKnee
rightKnee
leftAnkle
rightAnkle
leftHeel
rightHeel
leftFootIndex
rightFootIndex
```

The adapter may preserve additional MediaPipe landmarks later.

## Pose quality

```ts
export type PoseQualityLevel = "good" | "degraded" | "insufficient";

export interface PoseQuality {
  level: PoseQualityLevel;
  personPresent: boolean;
  fullBodyVisible: boolean;
  missingRequiredLandmarks: LandmarkName[];
  warnings: string[];
}
```

## Feature value

Derived values should be able to express invalidity.

```ts
export interface FeatureValue {
  value: number | null;
  valid: boolean;
  confidence?: number;
}
```

## MovementFeatures

Possible initial shape:

```ts
export interface MovementFeatures {
  timestampMs: number;
  wholeBodyActivity: FeatureValue;
  upperBodyActivity: FeatureValue;
  lowerBodyActivity: FeatureValue;
  trunkActivity: FeatureValue;
  leftWristSpeed: FeatureValue;
  rightWristSpeed: FeatureValue;
  leftAnkleSpeed: FeatureValue;
  rightAnkleSpeed: FeatureValue;
  hipCentreSpeed: FeatureValue;
}
```

## Session summary

Do not include a composite score initially.

```ts
export interface SessionSummary {
  durationMs: number;
  validObservationFraction: number;
  visibleFraction: number;
  activeFraction: number;
  upperBodyActivityMean: number | null;
  lowerBodyActivityMean: number | null;
  trunkActivityMean: number | null;
  longestInactiveIntervalMs: number | null;
}
```

## Exercise library and programme

Each reference clip represents one reusable exercise. Dose remains separate
from programme prescription so the same exercise can be assigned differently
in different programmes.

```ts
type ExerciseDoseType =
  | "repetitions"
  | "repetitions-each-side"
  | "duration"
  | "hold"
  | "free";

interface Exercise {
  id: string;
  name: string;
  shortInstruction: string;
  description?: string;
  category?: string;
  tags?: string[];
  doseType: ExerciseDoseType;
  recognition: ExerciseRecognitionConfig;
  referenceVideo?: string;
  defaultPrescription: ExercisePrescriptionDefaults;
}

interface ExercisePrescription {
  exerciseId: string;
  doseType?: ExerciseDoseType;
  dose: ExerciseDose;
  sets?: number;
  restBetweenSetsSeconds?: number;
  showDemonstrationBeforeExercise?: boolean;
  showDemonstrationBetweenSets?: boolean;
}

interface ExerciseProgramme {
  id: string;
  name: string;
  description?: string;
  exercises: ExercisePrescription[];
}
```

Programme array order is the explicit exercise order. The current runner treats
one ordered pass as a circuit set, so all prescriptions in a runnable programme
share one set count. Participant instructions are generated deterministically
from the dose type and prescription.

Finalized programme sessions have a stable `sessionId`, stable `programmeId`,
and `programmeNameSnapshot` so later programme renames do not rewrite history.
They retain timestamps, completion/ended-reason semantics, prescription copies,
and per-set prescribed versus completed duration or repetition values. Build 7
persists these compact results separately from high-frequency diagnostic JSONL.

## Recording format

JSONL is preferred for frame streams:

```json
{"type":"pose","timestampMs":0,"source":"participant", "...":"..."}
{"type":"features","timestampMs":0,"wholeBodyActivity":{"value":0.12,"valid":true}}
```

Session metadata should be separate or appear as the first record.

## Versioning

Every exported recording should carry:

- schema version;
- application version/commit where practical;
- pose engine identifier;
- feature configuration version.

Experimental thresholds without version identifiers make regression results difficult to interpret.

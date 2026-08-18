import type { SessionSummary } from "../engagement/types";
import { MOVEMENT_CONFIG, type MovementConfig } from "../movement/movementConfig";
import type { FeatureValue, MovementFeatures } from "../movement/types";
import type { PoseQuality } from "../pose/types";

export interface SessionSample {
  timestampMs: number;
  poseQuality: PoseQuality;
  movementFeatures: MovementFeatures;
}

interface WeightedMetric {
  weightedTotal: number;
  validDurationMs: number;
}

function addMetric(
  metric: WeightedMetric,
  feature: FeatureValue,
  durationMs: number,
): void {
  if (feature.valid && feature.value !== null) {
    metric.weightedTotal += feature.value * durationMs;
    metric.validDurationMs += durationMs;
  }
}

function metricMean(metric: WeightedMetric): number | null {
  return metric.validDurationMs > 0
    ? metric.weightedTotal / metric.validDurationMs
    : null;
}

export class SessionAggregator {
  private readonly startTimestampMs: number;
  private previousSample: SessionSample | null = null;
  private visibleDurationMs = 0;
  private validObservationDurationMs = 0;
  private validActivityDurationMs = 0;
  private activeDurationMs = 0;
  private currentInactiveDurationMs = 0;
  private longestInactiveDurationMs = 0;
  private sawValidActivity = false;
  private readonly wholeBody: WeightedMetric = { weightedTotal: 0, validDurationMs: 0 };
  private readonly upperBody: WeightedMetric = { weightedTotal: 0, validDurationMs: 0 };
  private readonly lowerBody: WeightedMetric = { weightedTotal: 0, validDurationMs: 0 };
  private readonly trunk: WeightedMetric = { weightedTotal: 0, validDurationMs: 0 };

  constructor(
    startTimestampMs: number,
    private readonly config: MovementConfig = MOVEMENT_CONFIG,
  ) {
    this.startTimestampMs = startTimestampMs;
  }

  add(sample: SessionSample): void {
    if (sample.timestampMs < this.startTimestampMs) {
      return;
    }

    if (this.previousSample && sample.timestampMs > this.previousSample.timestampMs) {
      this.integrate(
        this.previousSample,
        sample.timestampMs - this.previousSample.timestampMs,
      );
    }
    this.previousSample = sample;
  }

  finish(stopTimestampMs: number): SessionSummary {
    const endTimestampMs = Math.max(stopTimestampMs, this.startTimestampMs);
    if (
      this.previousSample &&
      endTimestampMs > this.previousSample.timestampMs
    ) {
      this.integrate(
        this.previousSample,
        endTimestampMs - this.previousSample.timestampMs,
      );
    }

    const durationMs = endTimestampMs - this.startTimestampMs;
    return {
      durationMs,
      validObservationFraction:
        durationMs > 0 ? this.validObservationDurationMs / durationMs : 0,
      visibleFraction: durationMs > 0 ? this.visibleDurationMs / durationMs : 0,
      activeFraction:
        this.validActivityDurationMs > 0
          ? this.activeDurationMs / this.validActivityDurationMs
          : 0,
      wholeBodyActivityMean: metricMean(this.wholeBody),
      upperBodyActivityMean: metricMean(this.upperBody),
      lowerBodyActivityMean: metricMean(this.lowerBody),
      trunkActivityMean: metricMean(this.trunk),
      longestInactiveIntervalMs: this.sawValidActivity
        ? this.longestInactiveDurationMs
        : null,
    };
  }

  private integrate(sample: SessionSample, durationMs: number): void {
    if (durationMs <= 0) return;

    if (sample.poseQuality.personPresent) {
      this.visibleDurationMs += durationMs;
    }

    const observationValid = sample.poseQuality.level !== "insufficient";
    if (observationValid) {
      this.validObservationDurationMs += durationMs;
    }

    const wholeBody = sample.movementFeatures.wholeBodyActivity;
    const activityValid = observationValid && wholeBody.valid && wholeBody.value !== null;
    if (activityValid) {
      this.sawValidActivity = true;
      this.validActivityDurationMs += durationMs;
      if (wholeBody.value! >= this.config.activeThreshold) {
        this.activeDurationMs += durationMs;
        this.currentInactiveDurationMs = 0;
      } else {
        this.currentInactiveDurationMs += durationMs;
        this.longestInactiveDurationMs = Math.max(
          this.longestInactiveDurationMs,
          this.currentInactiveDurationMs,
        );
      }
    } else {
      // Invalid observation ends, but never extends, an inactive interval.
      this.currentInactiveDurationMs = 0;
    }

    if (observationValid) {
      addMetric(this.wholeBody, sample.movementFeatures.wholeBodyActivity, durationMs);
      addMetric(this.upperBody, sample.movementFeatures.upperBodyActivity, durationMs);
      addMetric(this.lowerBody, sample.movementFeatures.lowerBodyActivity, durationMs);
      addMetric(this.trunk, sample.movementFeatures.trunkActivity, durationMs);
    }
  }
}

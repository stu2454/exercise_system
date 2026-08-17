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

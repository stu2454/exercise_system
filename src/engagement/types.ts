export interface SessionSummary {
  durationMs: number;
  validObservationFraction: number;
  visibleFraction: number;
  activeFraction: number;
  wholeBodyActivityMean: number | null;
  upperBodyActivityMean: number | null;
  lowerBodyActivityMean: number | null;
  trunkActivityMean: number | null;
  longestInactiveIntervalMs: number | null;
}

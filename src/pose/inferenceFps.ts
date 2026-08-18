const MAX_SAMPLES = 30;

export function appendInferenceTimestamp(
  timestampsMs: readonly number[],
  timestampMs: number,
): number[] {
  return [...timestampsMs, timestampMs].slice(-MAX_SAMPLES);
}

export function calculateInferenceFps(timestampsMs: readonly number[]): number {
  if (timestampsMs.length < 2) {
    return 0;
  }

  const elapsedMs = timestampsMs.at(-1)! - timestampsMs[0];
  if (elapsedMs <= 0) {
    return 0;
  }

  return ((timestampsMs.length - 1) * 1000) / elapsedMs;
}

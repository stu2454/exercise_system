export interface ProgrammeRunnerConfig {
  version: string;
  readyGesture: {
    dwellMs: number;
    wristAboveShoulderMarginNormalized: number;
    minLandmarkConfidence: number;
  };
}

export const PROGRAMME_RUNNER_CONFIG: ProgrammeRunnerConfig = {
  version: "build-6b-v1",
  readyGesture: {
    dwellMs: 650,
    wristAboveShoulderMarginNormalized: 0.03,
    minLandmarkConfidence: 0.5,
  },
};

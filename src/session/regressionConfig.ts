export interface RegressionConfig {
  version: string;
  defaultWarmupMs: number;
}

export const REGRESSION_CONFIG: RegressionConfig = {
  version: "build-5-stage-3-v1",
  defaultWarmupMs: 1000,
};

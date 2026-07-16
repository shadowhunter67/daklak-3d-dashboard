export interface BuildInfoInput {
  applicationVersion: string;
  gitCommit: string | undefined;
  buildTimestamp: string;
  datasetVersion: string;
  datasetSnapshot: string;
}

export interface BuildInfo {
  applicationVersion: string;
  gitCommit: string;
  buildTimestamp: string;
  datasetVersion: string;
  datasetSnapshot: string;
}

export function createBuildInfo(input: BuildInfoInput): BuildInfo {
  const gitCommit = input.gitCommit?.trim();
  return {
    applicationVersion: input.applicationVersion,
    gitCommit: gitCommit || 'unknown',
    buildTimestamp: new Date(input.buildTimestamp).toISOString(),
    datasetVersion: input.datasetVersion,
    datasetSnapshot: input.datasetSnapshot,
  };
}

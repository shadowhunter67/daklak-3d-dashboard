import { useEffect, useState } from 'react';
import type {
  ProjectDataError,
  ProjectPortfolioSource,
} from '../../../entities/project/adapters/ProjectPortfolioSource';
import { lookupProjectDetail } from '../model/buildProjectDetailViewModel';
import type { ProjectDetailModel } from '../model/projectDetailTypes';

export type ProjectDetailLoadState =
  | { status: 'loading' }
  | { status: 'ok'; model: ProjectDetailModel }
  | { status: 'degraded'; model: ProjectDetailModel; sourceIssues: string[] }
  | { status: 'not-found' }
  | { status: 'error'; error: ProjectDataError };

export function useProjectDetail(
  source: ProjectPortfolioSource,
  projectId: string,
  retryToken: number = 0,
): ProjectDetailLoadState {
  const [state, setState] = useState<ProjectDetailLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState({ status: 'loading' });

    source
      .loadPortfolio(controller.signal)
      .then((result) => {
        if (cancelled) return;
        if (result.status === 'error') {
          setState({ status: 'error', error: result.error });
          return;
        }
        const asOf = new Date();
        const lookup = lookupProjectDetail({
          bundles: result.data.bundles,
          context: { validAdministrativeCodes: result.data.validAdministrativeCodes, asOf },
          provenance: result.data.provenance,
          projectId,
        });
        if (lookup.status === 'not-found') {
          setState({ status: 'not-found' });
          return;
        }
        if (result.status === 'degraded')
          setState({ status: 'degraded', model: lookup.model, sourceIssues: result.issues });
        else setState({ status: 'ok', model: lookup.model });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setState({
          status: 'error',
          error: {
            kind: 'unknown',
            message:
              error instanceof Error ? error.message : 'Lỗi không xác định khi tải dữ liệu dự án.',
          },
        });
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [source, projectId, retryToken]);

  return state;
}

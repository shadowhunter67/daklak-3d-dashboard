import { useEffect, useState } from 'react';
import type {
  ProjectDataError,
  ProjectPortfolioSource,
} from '../../../entities/project/adapters/ProjectPortfolioSource';
import { buildProjectPortfolioViewModel } from '../model/buildProjectPortfolioViewModel';
import type { ProjectPortfolioModel } from '../model/projectPortfolioTypes';
import type { ProjectBundle } from '../../../entities/project/types';

export type ProjectPortfolioLoadState =
  | { status: 'loading' }
  | { status: 'ok'; model: ProjectPortfolioModel; bundles: readonly ProjectBundle[]; asOf: Date }
  | {
      status: 'degraded';
      model: ProjectPortfolioModel;
      bundles: readonly ProjectBundle[];
      asOf: Date;
      sourceIssues: string[];
    }
  | { status: 'error'; error: ProjectDataError };

/**
 * Same load/adapter pattern as `useExecutiveOverview` (spec D5: no business logic in components) —
 * exposes the raw `bundles`/`asOf` alongside the view model so `ProjectDetailView` can be built
 * from the same in-flight load without a second network round-trip when navigating Portfolio ->
 * Detail (both features share one `ProjectPortfolioSource` instance at the `App` level).
 */
export function useProjectPortfolio(
  source: ProjectPortfolioSource,
  retryToken: number = 0,
): ProjectPortfolioLoadState {
  const [state, setState] = useState<ProjectPortfolioLoadState>({ status: 'loading' });

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
        const model = buildProjectPortfolioViewModel({
          bundles: result.data.bundles,
          context: { validAdministrativeCodes: result.data.validAdministrativeCodes, asOf },
        });
        if (result.status === 'degraded')
          setState({
            status: 'degraded',
            model,
            bundles: result.data.bundles,
            asOf,
            sourceIssues: result.issues,
          });
        else setState({ status: 'ok', model, bundles: result.data.bundles, asOf });
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
  }, [source, retryToken]);

  return state;
}

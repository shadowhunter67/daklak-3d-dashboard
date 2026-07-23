import { useEffect, useState } from 'react';
import type {
  ProjectDataError,
  ProjectPortfolioSource,
} from '../../../entities/project/adapters/ProjectPortfolioSource';
import { buildExecutiveOverview } from '../model/buildExecutiveOverview';
import type { ExecutiveOverviewModel } from '../model/executiveOverviewTypes';

export type ExecutiveOverviewLoadState =
  | { status: 'loading' }
  | { status: 'ok'; model: ExecutiveOverviewModel }
  | { status: 'degraded'; model: ExecutiveOverviewModel; sourceIssues: string[] }
  | { status: 'error'; error: ProjectDataError };

/**
 * The one sanctioned call site for `new Date()` in this whole feature: the domain read model
 * (`buildExecutiveOverview`) and everything under `src/entities/project/` require an explicit
 * `asOf` — this hook is the UI/adapter boundary that supplies it, once, at load time.
 *
 * `retryToken` is not read — only its identity changing forces the load effect to re-run, so a
 * "Thử lại" button can retry after an error without needing a new `source` instance.
 */
export function useExecutiveOverview(
  source: ProjectPortfolioSource,
  retryToken: number = 0,
): ExecutiveOverviewLoadState {
  const [state, setState] = useState<ExecutiveOverviewLoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    // Deliberate: resets to 'loading' whenever `source`/`retryToken` changes (e.g. the "Thử lại"
    // retry button) so a stale ok/error/degraded result is never shown while a new request is in
    // flight.
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
        const model = buildExecutiveOverview({
          bundles: result.data.bundles,
          context: { validAdministrativeCodes: result.data.validAdministrativeCodes, asOf },
          sourceStatus: result.status === 'degraded' ? 'degraded' : 'ok',
        });
        if (result.status === 'degraded')
          setState({ status: 'degraded', model, sourceIssues: result.issues });
        else setState({ status: 'ok', model });
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

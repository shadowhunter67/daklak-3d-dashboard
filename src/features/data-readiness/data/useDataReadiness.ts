import { useEffect, useState } from 'react';
import type {
  ProjectDataError,
  ProjectPortfolioSource,
} from '../../../entities/project/adapters/ProjectPortfolioSource';
import { buildDataReadinessViewModel } from '../model/buildDataReadinessViewModel';
import type { DataReadinessModel } from '../model/dataReadinessTypes';

export type DataReadinessLoadState =
  | { status: 'loading' }
  | { status: 'ok'; model: DataReadinessModel }
  | { status: 'degraded'; model: DataReadinessModel; sourceIssues: string[] }
  | { status: 'error'; error: ProjectDataError };

/** Cùng pattern load/adapter với `useProjectPortfolio`/`useExecutiveOverview` (không có business logic
 * trong component). */
export function useDataReadiness(
  source: ProjectPortfolioSource,
  retryToken: number = 0,
): DataReadinessLoadState {
  const [state, setState] = useState<DataReadinessLoadState>({ status: 'loading' });

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
        const model = buildDataReadinessViewModel({
          bundles: result.data.bundles,
          metadata: result.data.metadata,
          context: { validAdministrativeCodes: result.data.validAdministrativeCodes, asOf },
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
              error instanceof Error
                ? error.message
                : 'Lỗi không xác định khi tải dữ liệu Data Readiness.',
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

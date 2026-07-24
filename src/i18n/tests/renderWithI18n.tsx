import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { I18nProvider } from '../I18nProvider';

/** Shared test helper: every component under `src/i18n`'s translation scope calls `useTranslation()`,
 * which throws outside an `I18nProvider` — tests render through this instead of bare `render()`. */
export function renderWithI18n(ui: ReactElement): RenderResult {
  return render(<I18nProvider>{ui}</I18nProvider>);
}

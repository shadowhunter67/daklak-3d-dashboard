import { vi } from './messages/vi';

/** Union of every valid translation key — a typo in `t('...')` is a compile error, not a silent
 * runtime miss. `en.ts` is typed against this (see messages/en.ts), so its keys can never drift
 * ahead of `vi.ts` (the source of truth) even though it is only a `Partial`. */
export type MessageKey = keyof typeof vi;

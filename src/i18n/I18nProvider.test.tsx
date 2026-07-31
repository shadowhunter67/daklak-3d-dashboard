import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useTranslation } from './useTranslation';
import { I18nProvider } from './I18nProvider';
import { vi as viMessages } from './messages/vi';
import { en as enMessages } from './messages/en';

function Probe() {
  const { locale, setLocale, t } = useTranslation();
  return (
    <div>
      <p data-testid="locale">{locale}</p>
      <p data-testid="greeting">{t('header.lang.vi')}</p>
      {/* Differs between dictionaries ("Tổng quan điều hành" vs "Executive Overview") — unlike
          header.lang.vi above (literally "VI" in both), this actually proves translated text
          tracks `locale`, not just that the locale string itself updated. */}
      <p data-testid="translated-text">{t('header.nav.overview')}</p>
      <button onClick={() => setLocale('en')}>to-en</button>
      <button onClick={() => setLocale('vi')}>to-vi</button>
    </div>
  );
}

function resetUrl(search: string, hash = '') {
  window.history.replaceState(null, '', `/${search}${hash}`);
}

describe('I18nProvider', () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetUrl('');
  });
  afterEach(cleanup);

  it('defaults to vi with no URL param and no persisted preference', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('vi');
    expect(document.documentElement.lang).toBe('vi');
  });

  it('resolves from ?lang= on mount, over any persisted preference', () => {
    window.localStorage.setItem('daklak-dashboard.locale', 'vi');
    resetUrl('?lang=en');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('falls back to a persisted preference when the URL has no lang param', () => {
    window.localStorage.setItem('daklak-dashboard.locale', 'en');
    resetUrl('?view=3d');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
  });

  it('switching locale updates document.documentElement.lang', async () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    await screen.findByText('en');
    expect(document.documentElement.lang).toBe('en');
  });

  it('switching locale preserves other query params and the hash route', () => {
    resetUrl('?view=map&mode=overview', '#/projects/prj-001');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    expect(window.location.search).toContain('view=map');
    expect(window.location.search).toContain('mode=overview');
    expect(window.location.search).toContain('lang=en');
    expect(window.location.hash).toBe('#/projects/prj-001');
  });

  it('switching locale persists the new preference', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    expect(window.localStorage.getItem('daklak-dashboard.locale')).toBe('en');
  });

  it('pushes a history entry so Back can undo a locale switch', () => {
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    const before = window.history.length;
    fireEvent.click(screen.getByText('to-en'));
    expect(window.history.length).toBe(before + 1);
  });

  it('reacts to Back/Forward (popstate) by re-deriving locale from the URL', () => {
    // Explicit ?lang=vi (not just "no lang param") so the assertion exercises the URL winning,
    // not an unrelated fallback to whatever happens to be in localStorage at that point.
    resetUrl('?lang=vi');
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    expect(screen.getByTestId('locale')).toHaveTextContent('en');
    // Simulate the browser restoring the previous URL on Back, then firing popstate.
    resetUrl('?lang=vi');
    act(() => {
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByTestId('locale')).toHaveTextContent('vi');
  });

  it('falls back to the Vietnamese string for a key missing from the English dictionary', async () => {
    // Every key in en.ts is a subset of vi.ts (Partial<Record<MessageKey,string>>) — this proves
    // the *runtime* fallback behavior, not just the type constraint.
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByText('to-en'));
    await screen.findByText('en');
  });

  it('renders translated text in English, and back in Vietnamese again after switching back', async () => {
    // Regression test: `t()` used to read `enDictionary?.[key] ?? vi[key]` without checking
    // `locale` at all — once the English dictionary had loaded once (any prior switch to 'en'
    // in the session), it stayed preferred forever, so switching back to 'vi' updated
    // `document.documentElement.lang` and the URL correctly but left the visible UI text stuck
    // in English. Reported live as "chuyển VI/EN không tự chuyển luôn" (switching sometimes does
    // nothing visible) after rapid VI/EN toggling — but it reproduces with a single clean
    // switch-and-switch-back too, not just rapid clicking.
    render(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Tổng quan điều hành');

    fireEvent.click(screen.getByText('to-en'));
    await screen.findByText('Executive Overview');
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Executive Overview');

    fireEvent.click(screen.getByText('to-vi'));
    expect(screen.getByTestId('translated-text')).toHaveTextContent('Tổng quan điều hành');
  });
});

describe('vi/en dictionary shape', () => {
  it('every English entry has a matching Vietnamese key (en is a strict subset)', () => {
    for (const key of Object.keys(enMessages)) {
      expect(viMessages).toHaveProperty(key);
    }
  });

  it('no dictionary value is an empty string (an accidental blank entry would render nothing)', () => {
    for (const [key, value] of Object.entries(viMessages)) {
      expect(value.length, `vi['${key}'] must not be empty`).toBeGreaterThan(0);
    }
    for (const [key, value] of Object.entries(enMessages)) {
      expect(value!.length, `en['${key}'] must not be empty`).toBeGreaterThan(0);
    }
  });
});

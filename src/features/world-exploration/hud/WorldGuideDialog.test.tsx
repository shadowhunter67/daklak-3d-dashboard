import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithI18n as render } from '../../../i18n/tests/renderWithI18n';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { WorldGuideDialog } from './WorldGuideDialog';

const STORAGE_KEY = 'daklak-dashboard:world-onboarding-dismissed';

describe('WorldGuideDialog', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useWorldExplorationStore.setState({ onboardingOpen: false });
  });
  afterEach(cleanup);

  it('auto-opens on first mount for a visitor who has never dismissed it', () => {
    render(<WorldGuideDialog />);
    expect(screen.getByRole('dialog', { name: /bắt đầu khám phá/i })).toBeInTheDocument();
  });

  it('does not auto-open if already dismissed previously', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<WorldGuideDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('dismissing persists the flag and closes the dialog', () => {
    render(<WorldGuideDialog />);
    fireEvent.click(screen.getByRole('button', { name: /bắt đầu/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('Escape closes the dialog and persists dismissal', () => {
    render(<WorldGuideDialog />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem(STORAGE_KEY)).toBe('true');
  });

  it('the manual Help trigger (setOnboardingOpen(true)) reopens it even after dismissal', () => {
    window.localStorage.setItem(STORAGE_KEY, 'true');
    render(<WorldGuideDialog />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    act(() => useWorldExplorationStore.getState().setOnboardingOpen(true));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('lists all 4 control hints (walk, fly, interact, escape)', () => {
    render(<WorldGuideDialog />);
    expect(screen.getByText(/WASD/)).toBeInTheDocument();
    expect(screen.getByText(/Space/)).toBeInTheDocument();
    expect(screen.getByText(/Esc/)).toBeInTheDocument();
    expect(screen.getByText(/Nhấn E hoặc chạm/)).toBeInTheDocument();
  });
});

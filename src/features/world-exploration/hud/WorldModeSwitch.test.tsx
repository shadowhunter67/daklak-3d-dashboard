import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithI18n as render } from '../../../i18n/tests/renderWithI18n';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { WorldModeSwitch } from './WorldModeSwitch';

describe('WorldModeSwitch', () => {
  beforeEach(() => {
    useWorldExplorationStore.setState({
      mode: 'fly',
      teleportMenuOpen: false,
      activeTourId: null,
      tourPlaying: false,
    });
    window.history.replaceState(null, '', '/');
  });
  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('renders Walk/Fly/Tour as a labeled group of 3 buttons', () => {
    render(<WorldModeSwitch />);
    expect(screen.getByRole('group', { name: 'Chế độ khám phá' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /đi bộ/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^chuyển sang chế độ bay tự do/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /mở danh sách tuyến/i })).toBeInTheDocument();
  });

  it('marks the current mode as pressed and only that one', () => {
    render(<WorldModeSwitch />);
    const walk = screen.getByRole('button', { name: /đi bộ/i });
    const fly = screen.getByRole('button', { name: /^chuyển sang chế độ bay tự do/i });
    expect(fly).toHaveAttribute('aria-pressed', 'true');
    expect(walk).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking Walk switches the store mode to walk', () => {
    render(<WorldModeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: /đi bộ/i }));
    expect(useWorldExplorationStore.getState().mode).toBe('walk');
  });

  it('clicking Tour switches mode to tour AND opens the teleport menu (no tour picked yet)', () => {
    render(<WorldModeSwitch />);
    fireEvent.click(screen.getByRole('button', { name: /mở danh sách tuyến/i }));
    expect(useWorldExplorationStore.getState().mode).toBe('tour');
    expect(useWorldExplorationStore.getState().teleportMenuOpen).toBe(true);
  });

  it('renders English labels when the locale is English', async () => {
    window.history.replaceState(null, '', '/?lang=en');
    render(<WorldModeSwitch />);
    expect(await screen.findByText('Walk')).toBeInTheDocument();
    expect(screen.getByText('Fly')).toBeInTheDocument();
    expect(screen.getByText('Tour')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Exploration mode' })).toBeInTheDocument();
  });
});

import { act, cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { renderWithI18n as render } from '../../../i18n/tests/renderWithI18n';
import { useWorldExplorationStore } from '../state/worldExplorationStore';
import { WorldTourControls } from './WorldTourControls';

describe('WorldTourControls', () => {
  beforeEach(() => {
    useWorldExplorationStore.setState({
      mode: 'fly',
      activeTourId: null,
      tourPlaying: false,
      tourStopIndex: 0,
    });
  });
  afterEach(cleanup);

  it('renders nothing when not in tour mode', () => {
    render(<WorldTourControls />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders nothing in tour mode with no active tour picked yet', () => {
    useWorldExplorationStore.setState({ mode: 'tour', activeTourId: null });
    render(<WorldTourControls />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('shows playing status with the real tour title and stop count when a tour is active', () => {
    useWorldExplorationStore.setState({
      mode: 'tour',
      activeTourId: 'lakes-and-waterfalls',
      tourPlaying: true,
      tourStopIndex: 0,
    });
    render(<WorldTourControls />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Hồ & Thác — Đắk Lắk sông nước');
    expect(status).toHaveTextContent('1/2');
  });

  it('shows Pause while playing, Resume while paused', () => {
    useWorldExplorationStore.setState({
      mode: 'tour',
      activeTourId: 'lakes-and-waterfalls',
      tourPlaying: true,
    });
    render(<WorldTourControls />);
    expect(screen.getByRole('button', { name: /tạm dừng/i })).toBeInTheDocument();

    act(() => useWorldExplorationStore.getState().pauseTour());
    expect(screen.getByRole('button', { name: /tiếp tục/i })).toBeInTheDocument();
  });

  it('Stop button clears the active tour', () => {
    useWorldExplorationStore.setState({
      mode: 'tour',
      activeTourId: 'lakes-and-waterfalls',
      tourPlaying: true,
    });
    render(<WorldTourControls />);
    fireEvent.click(screen.getByRole('button', { name: /kết thúc tour/i }));
    expect(useWorldExplorationStore.getState().activeTourId).toBeNull();
  });

  it('an unknown/stale tour id renders nothing rather than crashing', () => {
    useWorldExplorationStore.setState({
      mode: 'tour',
      activeTourId: 'not-a-real-tour',
      tourPlaying: true,
    });
    render(<WorldTourControls />);
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});

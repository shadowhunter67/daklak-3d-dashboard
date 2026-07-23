import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { OnboardingOverlay } from './OnboardingOverlay';

describe('OnboardingOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useMapStore.setState({ helpSignal: 0, viewMode: '3d' });
  });
  afterEach(cleanup);

  it('introduces the primary interactions and remembers dismissal', () => {
    render(<OnboardingOverlay />);
    expect(screen.getByRole('dialog', { name: /102 xã, phường/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu khám phá' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('daklak-dashboard:onboarding-dismissed')).toBe('true');
  });

  it('shows detail-map-specific gestures instead of the 3D rotate copy when in map view', () => {
    useMapStore.setState({ viewMode: 'map' });
    render(<OnboardingOverlay />);
    expect(screen.getByRole('dialog', { name: /102 xã, phường/i })).toBeInTheDocument();
    expect(screen.queryByText('xoay góc nhìn')).not.toBeInTheDocument();
    expect(screen.getByText('Lớp bản đồ')).toBeInTheDocument();
  });

  it('does not auto-open on first visit while landing on Executive Overview', () => {
    useMapStore.setState({ viewMode: 'overview' });
    render(<OnboardingOverlay />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('still opens from the help control while on Executive Overview', () => {
    useMapStore.setState({ viewMode: 'overview' });
    render(<OnboardingOverlay />);
    act(() => useMapStore.getState().requestHelp());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('can be opened again from the help control', () => {
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
    render(<OnboardingOverlay />);
    act(() => useMapStore.getState().requestHelp());
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('closes with Escape and returns focus to the previous control', async () => {
    window.localStorage.setItem('daklak-dashboard:onboarding-dismissed', 'true');
    const help = document.createElement('button');
    document.body.append(help);
    help.focus();
    render(<OnboardingOverlay />);
    act(() => useMapStore.getState().requestHelp());
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(document.activeElement).toBe(help));
    help.remove();
  });
});

import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useMapStore } from '../../stores/mapStore';
import { OnboardingOverlay } from './OnboardingOverlay';

describe('OnboardingOverlay', () => {
  beforeEach(() => {
    window.localStorage.clear();
    useMapStore.setState({ helpSignal: 0 });
  });
  afterEach(cleanup);

  it('introduces the primary interactions and remembers dismissal', () => {
    render(<OnboardingOverlay />);
    expect(screen.getByRole('dialog', { name: /102 xã, phường/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Bắt đầu khám phá' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(window.localStorage.getItem('daklak-dashboard:onboarding-dismissed')).toBe('true');
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

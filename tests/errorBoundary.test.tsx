import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';

function Bomb(): never {
  throw new Error('Simulated crash for test');
}

describe('ErrorBoundary (prevents blank-screen crashes)', () => {
  it('renders a recovery message instead of a blank screen when a child throws', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    );
    expect(screen.getByText(/something went wrong/i)).toBeTruthy();
    expect(screen.getByRole('button', { name: /reload/i })).toBeTruthy();
    spy.mockRestore();
  });

  it('renders children normally when nothing throws', () => {
    render(
      <ErrorBoundary>
        <div>All good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('All good')).toBeTruthy();
  });
});

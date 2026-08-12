import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { BaselineStrip } from './BaselineStrip';
import type { MonitoringBaseline } from '@/mocks/types';

const base: MonitoringBaseline = {
  state: 'learning',
  learning: 15,
  monitored: 1500,
  windowDays: 14,
};

function renderStrip(
  baseline: MonitoringBaseline | undefined,
  overrides: Partial<{ loading: boolean; failed: boolean; affectedAlerts: number }> = {},
) {
  const onShowAffected = vi.fn();
  const onRetry = vi.fn();
  const { container } = render(
    <BaselineStrip
      baseline={baseline}
      loading={overrides.loading ?? false}
      failed={overrides.failed ?? false}
      affectedAlerts={overrides.affectedAlerts ?? 12}
      onShowAffected={onShowAffected}
      onRetry={onRetry}
    />,
  );
  return { container, onShowAffected, onRetry };
}

describe('BaselineStrip coverage states', () => {
  it('reports the settled count and offers no link when nothing is learning', () => {
    renderStrip({ ...base, state: 'established', learning: 0 }, { affectedAlerts: 0 });
    expect(screen.getByText('Baseline established')).toBeInTheDocument();
    expect(screen.getByText('1,500')).toBeInTheDocument();
    expect(screen.getByText('of 1,500 monitored')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows established-of-total while learning, never the learning count as the headline number', () => {
    renderStrip(base);
    expect(screen.getByText('Learning normal behaviour')).toBeInTheDocument();
    expect(screen.getByText('1,485')).toBeInTheDocument();
    expect(screen.getByText('of 1,500 monitored')).toBeInTheDocument();
  });

  it('links to the affected alerts with the count it will actually filter to', async () => {
    const { onShowAffected } = renderStrip(base, { affectedAlerts: 12 });
    const link = screen.getByRole('button', { name: /show 12 alerts/i });
    await userEvent.click(link);
    expect(onShowAffected).toHaveBeenCalledOnce();
  });

  // Identities routinely learn without raising anything; a link promising alerts that
  // filters to an empty feed is a dead end.
  it('drops the link when no alert has been raised on a learning identity', () => {
    renderStrip(base, { affectedAlerts: 0 });
    expect(screen.queryByRole('button', { name: /show .* alert/i })).not.toBeInTheDocument();
    expect(screen.getByText(/none has raised an alert yet/i)).toBeInTheDocument();
  });

  // The state the whole component exists for: no coverage at all, where an empty feed
  // would otherwise read as safety.
  it('warns that a quiet feed is not all-clear when nothing has a baseline', () => {
    renderStrip({ ...base, learning: 1500 }, { affectedAlerts: 0 });
    expect(screen.getByText(/no baseline yet/i)).toBeInTheDocument();
    expect(screen.getByText(/does not mean nothing is wrong/i)).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('renders nothing before anything is onboarded', () => {
    const { container } = renderStrip({ ...base, learning: 0, monitored: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it('says coverage is unknown on failure rather than implying it is fine', async () => {
    const { onRetry } = renderStrip(undefined, { failed: true });
    expect(screen.getByText('Baseline coverage unavailable')).toBeInTheDocument();
    expect(screen.getByText('coverage unknown')).toBeInTheDocument();
    expect(screen.queryByText(/established/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('claims no coverage while loading', () => {
    renderStrip(undefined, { loading: true });
    expect(screen.queryByText(/monitored/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/established/i)).not.toBeInTheDocument();
  });
});

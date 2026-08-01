import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OnboardingScreen } from './OnboardingScreen';
import { useUiStore } from '@/stores/ui';

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => vi.fn(),
}));

beforeEach(() => {
  // Onboarding is admin-only; the default actor already holds connector.manage.
  useUiStore.getState().setRole('tenant-admin');
});

describe('OnboardingScreen — Connect step', () => {
  it('offers no bulk-connect action; each cloud is connected from its own card', () => {
    render(<OnboardingScreen />);
    expect(screen.queryByRole('button', { name: /connect all/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /connect remaining/i })).not.toBeInTheDocument();
    // One per-cloud Connect button for each of AWS, GCP and Azure.
    expect(screen.getAllByRole('button', { name: /^connect /i })).toHaveLength(3);
  });

  it('still states the rule for proceeding', () => {
    render(<OnboardingScreen />);
    expect(screen.getByText(/connect at least one cloud to continue/i)).toBeInTheDocument();
  });
});

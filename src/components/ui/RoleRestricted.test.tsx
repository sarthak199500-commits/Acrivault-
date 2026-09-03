import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { RoleRestricted } from './RoleRestricted';
import { useUiStore } from '@/stores/ui';

beforeEach(() => useUiStore.getState().setRole('viewer'));

describe('RoleRestricted', () => {
  it('names the reader’s role and who can lift the restriction', () => {
    render(<RoleRestricted action="modify users" remedy="Tenant Admin" />);
    expect(
      screen.getByText('Read-only. Your role (Auditor) cannot modify users. Contact a Tenant Admin.'),
    ).toBeInTheDocument();
  });

  // ROLE_LABELS.viewer is the compound 'Read-only / Auditor', which does not read
  // inside a parenthetical — "Your role (Read-only / Auditor)". ROLE_SHORT does.
  it('uses the short role label, not the compound one', () => {
    render(<RoleRestricted action="modify users" remedy="Tenant Admin" />);
    expect(screen.queryByText(/read-only \/ auditor/i)).not.toBeInTheDocument();
  });

  it('reads the role from the store rather than assuming the auditor', () => {
    useUiStore.getState().setRole('analyst');
    render(<RoleRestricted action="activate a policy" remedy="Security Admin" />);
    expect(screen.getByText(/your role \(analyst\)/i)).toBeInTheDocument();
  });

  // A remedy is not always knowable — some restrictions have no single role that
  // lifts them — so the reason stands on its own without inventing one.
  it('states the reason without a remedy when none is given', () => {
    render(<RoleRestricted action="modify users" />);
    expect(
      screen.getByText('Read-only. Your role (Auditor) cannot modify users.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/contact a/i)).not.toBeInTheDocument();
  });

  it('still accepts a fully custom note', () => {
    render(<RoleRestricted note="Your role can review but not act on the selection." />);
    expect(screen.getByText(/review but not act/i)).toBeInTheDocument();
  });

  it('lets note override action and remedy rather than concatenating them', () => {
    render(<RoleRestricted note="One-off wording." action="modify users" remedy="Tenant Admin" />);
    expect(screen.getByText('One-off wording.')).toBeInTheDocument();
    expect(screen.queryByText(/cannot modify users/i)).not.toBeInTheDocument();
  });

  it('falls back to a generic sentence when no action is given', () => {
    render(<RoleRestricted />);
    expect(screen.getByText(/read-only access here/i)).toBeInTheDocument();
  });

  it('carries the same sentence in the inline layout', () => {
    render(<RoleRestricted inline action="modify users" remedy="Tenant Admin" />);
    expect(screen.getByText(/cannot modify users\. contact a tenant admin\./i)).toBeInTheDocument();
    // The inline form is a span in a sentence, not a standalone notice.
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

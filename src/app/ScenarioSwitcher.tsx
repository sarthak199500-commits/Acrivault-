import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useUiStore } from '@/stores/ui';
import { ROLES, ROLE_SHORT } from '@/lib/permissions';
import {
  AUTH_SCENARIOS,
  AUTH_SCENARIO_LABELS,
  LATENCY_PRESETS,
  type ScenarioState,
  type SignInMethod,
} from '@/mocks/scenarios';
import type { Density, Theme } from '@/stores/ui';

const STATES: ScenarioState[] = ['auto', 'loading', 'empty', 'error', 'populated'];
const SIGN_IN_METHODS: SignInMethod[] = ['auto', 'sso', 'password'];

/** Demo entry points for the auth/registration screens (no nav links elsewhere). */
const AUTH_SCREENS: { to: string; label: string }[] = [
  { to: '/login', label: 'Sign in' },
  { to: '/register', label: 'Request access' },
  { to: '/mfa/setup', label: 'MFA setup' },
  { to: '/forgot-password', label: 'Forgot password' },
];

function Segment<T extends string>({
  label,
  value,
  options,
  onChange,
  format,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  format?: (v: T) => string;
}) {
  return (
    <div>
      <div className="mb-1 eyebrow">{label}</div>
      <div className="flex flex-wrap gap-1">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            aria-pressed={opt === value}
            className={cn(
              'rounded-[var(--r-sm)] border px-2 py-1 text-[length:var(--fs-micro)] capitalize transition-colors',
              opt === value
                ? 'border-accent bg-accent-tint text-accent-text'
                : 'border-border bg-surface text-text-secondary hover:bg-surface-hover',
            )}
          >
            {format ? format(opt) : opt}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * Dev-only Scenario Switcher. Lets a reviewer force any screen into loading /
 * empty / error / populated and flip role, theme, density, and latency — no code
 * edits. Hidden in production builds.
 */
export function ScenarioSwitcher() {
  const [open, setOpen] = useState(false);
  const store = useUiStore();

  if (import.meta.env.PROD) return null;

  return (
    <div
      role="complementary"
      aria-label="Developer scenario controls"
      // pointer-events-auto: this dev tool must stay clickable even when a modal
      // Drawer/Dialog is open — Radix sets `pointer-events: none` on <body> in
      // modal mode, which this island overrides (it already sits above --z-modal).
      className="pointer-events-auto fixed bottom-4 right-4 z-[var(--z-toast)] print:hidden"
    >
      {open ? (
        <div className="flex max-h-[calc(100dvh-2rem)] w-72 flex-col rounded-[var(--r-lg)] border border-border-strong bg-surface-2 shadow-[var(--shadow-xl)]">
          <div className="flex shrink-0 items-center justify-between border-b border-border px-3 py-2.5">
            <span className="inline-flex items-center gap-1.5 text-[length:var(--fs-small)] font-semibold text-text">
              <FlaskConical className="h-4 w-4 text-accent-text" aria-hidden="true" />
              Scenario
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close scenario switcher"
              className="text-text-tertiary hover:text-text"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 space-y-3 overflow-y-auto overscroll-contain px-3 py-3">
            <Segment
              label="Data state"
              value={store.scenario.state}
              options={STATES}
              onChange={(v) => store.setScenarioState(v)}
            />
            <Segment
              label="Role"
              value={store.role}
              options={ROLES}
              onChange={(v) => store.setRole(v)}
              format={(r) => ROLE_SHORT[r]}
            />
            <Segment
              label="Auth & admin"
              value={store.scenario.auth}
              options={AUTH_SCENARIOS}
              onChange={(v) => store.setAuthScenario(v)}
              format={(s) => AUTH_SCENARIO_LABELS[s]}
            />
            <Segment
              label="Sign-in method"
              value={store.scenario.signIn}
              options={SIGN_IN_METHODS}
              onChange={(v) => store.setSignIn(v)}
              format={(m) => (m === 'sso' ? 'SSO' : m[0].toUpperCase() + m.slice(1))}
            />
            <Segment
              label="Theme"
              value={store.theme}
              options={['dark', 'light'] as Theme[]}
              onChange={(v) => store.setTheme(v)}
            />
            <Segment
              label="Density"
              value={store.density}
              options={['comfortable', 'compact'] as Density[]}
              onChange={(v) => store.setDensity(v)}
            />
            <div>
              <div className="mb-1 eyebrow">Latency</div>
              <div className="flex flex-wrap gap-1">
                {LATENCY_PRESETS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => store.setLatency(p.value)}
                    aria-pressed={p.value === store.scenario.latencyMs}
                    className={cn(
                      'rounded-[var(--r-sm)] border px-2 py-1 text-[length:var(--fs-micro)] transition-colors',
                      p.value === store.scenario.latencyMs
                        ? 'border-accent bg-accent-tint text-accent-text'
                        : 'border-border bg-surface text-text-secondary hover:bg-surface-hover',
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center justify-between text-[length:var(--fs-small)] text-text-secondary">
              Reduced motion
              <input
                type="checkbox"
                checked={store.reducedMotion}
                onChange={(e) => store.setReducedMotion(e.target.checked)}
                className="h-4 w-4 accent-[var(--accent)]"
              />
            </label>
            <div>
              <div className="mb-1 eyebrow">Auth screens</div>
              <div className="flex flex-wrap gap-1">
                {AUTH_SCREENS.map((s) => (
                  <Link
                    key={s.to}
                    to={s.to}
                    onClick={() => setOpen(false)}
                    className="rounded-[var(--r-sm)] border border-border bg-surface px-2 py-1 text-[length:var(--fs-micro)] text-text-secondary transition-colors hover:bg-surface-hover hover:text-text"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--r-pill)] border border-border-strong bg-surface-2 px-3 py-2 text-[length:var(--fs-small)] text-text-secondary shadow-[var(--shadow-md)] hover:text-text"
        >
          <FlaskConical className="h-4 w-4 text-accent-text" aria-hidden="true" />
          Scenario
          {store.scenario.state !== 'auto' && (
            <span className="rounded-[var(--r-xs)] bg-accent-tint px-1.5 text-[length:var(--fs-micro)] capitalize text-accent-text">
              {store.scenario.state}
            </span>
          )}
          {store.scenario.auth !== 'normal' && (
            <span className="rounded-[var(--r-xs)] bg-warn-bg px-1.5 text-[length:var(--fs-micro)] text-warn-fg">
              {AUTH_SCENARIO_LABELS[store.scenario.auth]}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

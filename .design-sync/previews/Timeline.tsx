import type { ReactNode } from 'react';
import { Timeline } from 'acrivault';
import { KeyRound, Layers, RefreshCw, ShieldCheck, TriangleAlert, Wrench } from 'lucide-react';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 20, maxWidth: 480 }}>
      {children}
    </div>
  );
}

/** An agent session replayed step by step: completed steps carry the filled
 *  accent node, the step under inspection is `active`, and each row shows its
 *  sequence number in the meta slot. */
export function Default() {
  return (
    <Frame>
      <Timeline
        ariaLabel="Agent session steps"
        items={[
          { id: '1', icon: <Layers className="h-3.5 w-3.5" />, title: 'Prompt received', meta: '#1', tone: 'done' },
          { id: '2', icon: <Wrench className="h-3.5 w-3.5" />, title: 'Tool call · listBuckets', meta: '#2', tone: 'done' },
          { id: '3', icon: <KeyRound className="h-3.5 w-3.5" />, title: 'Assumed billing-reconciler', meta: '#3', tone: 'done' },
          { id: '4', icon: <Layers className="h-3.5 w-3.5" />, title: 'Model response', meta: '#4', tone: 'active' },
        ]}
      />
    </Frame>
  );
}

/** The `anomaly` tone flags a suspicious step in critical red without breaking
 *  the vertical rhythm — the signal a reviewer scans the rail for. */
export function WithAnomaly() {
  return (
    <Frame>
      <Timeline
        ariaLabel="Session steps with an anomaly"
        items={[
          { id: '1', icon: <Wrench className="h-3.5 w-3.5" />, title: 'Tool call · getSecretValue', meta: '02:14:07', tone: 'done' },
          { id: '2', icon: <TriangleAlert className="h-3.5 w-3.5" />, title: 'Off-pattern region: ap-south-1', meta: '02:14:09', tone: 'anomaly' },
          { id: '3', icon: <Wrench className="h-3.5 w-3.5" />, title: 'Tool call · putObject', meta: '02:14:11', tone: 'default' },
          { id: '4', icon: <Layers className="h-3.5 w-3.5" />, title: 'Session ended', meta: '02:14:20', tone: 'default' },
        ]}
      />
    </Frame>
  );
}

/** All four tones in order — `done` (filled accent), `active` (accent tint),
 *  `anomaly` (critical), `default` (neutral, for steps not yet reached). */
export function Tones() {
  return (
    <Frame>
      <Timeline
        ariaLabel="Timeline tones"
        items={[
          { id: 'done', icon: <ShieldCheck className="h-3.5 w-3.5" />, title: 'done · step complete', tone: 'done' },
          { id: 'active', icon: <RefreshCw className="h-3.5 w-3.5" />, title: 'active · in progress', tone: 'active' },
          { id: 'anomaly', icon: <TriangleAlert className="h-3.5 w-3.5" />, title: 'anomaly · needs review', tone: 'anomaly' },
          { id: 'default', icon: <Layers className="h-3.5 w-3.5" />, title: 'default · not yet reached', tone: 'default' },
        ]}
      />
    </Frame>
  );
}

/** When items carry `onSelect` the rows become buttons, and the `selected` row
 *  keeps the hover surface and a medium-weight title — the side-rail pattern on
 *  Session Replay, where picking a step drives the detail pane. */
export function Selectable() {
  return (
    <Frame>
      <Timeline
        ariaLabel="Rotation phases"
        items={[
          { id: 'stage', icon: <ShieldCheck className="h-3.5 w-3.5" />, title: 'Stage new credential', meta: 'done', tone: 'done', onSelect: () => {} },
          { id: 'issue', icon: <KeyRound className="h-3.5 w-3.5" />, title: 'Issue AKIA7GQ1MB4KDTVR', meta: 'done', tone: 'done', onSelect: () => {} },
          { id: 'propagate', icon: <RefreshCw className="h-3.5 w-3.5" />, title: 'Propagate to 6 consumers', meta: '50%', tone: 'active', selected: true, onSelect: () => {} },
          { id: 'cutover', icon: <Layers className="h-3.5 w-3.5" />, title: 'Cut over', meta: 'queued', tone: 'default', onSelect: () => {} },
        ]}
      />
    </Frame>
  );
}

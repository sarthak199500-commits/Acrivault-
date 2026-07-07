import { Check } from 'lucide-react';
import { ROTATION_PHASES, type RotationPhase } from '@/mocks/types';
import { cn } from '@/lib/cn';

const PHASE_LABEL: Record<RotationPhase, string> = {
  prepare: 'Prepare',
  issue: 'Issue',
  propagate: 'Propagate',
  verify: 'Verify',
  revoke: 'Revoke',
  confirm: 'Confirm',
};

/**
 * The six-phase zero-downtime rotation lifecycle.
 * // ASSUMPTION: phase naming and mechanics are Architect-owned; displayed from fixtures.
 */
export function PhaseTrack({
  phase,
  phaseProgress,
  size = 'md',
}: {
  phase: RotationPhase;
  phaseProgress: number;
  size?: 'sm' | 'md';
}) {
  const current = ROTATION_PHASES.indexOf(phase);
  const dot = size === 'sm' ? 'h-5 w-5' : 'h-7 w-7';

  return (
    <ol className="flex items-stretch" aria-label="Rotation progress">
      {ROTATION_PHASES.map((p, i) => {
        const state = i < current ? 'done' : i === current ? 'active' : 'upcoming';
        const isLast = i === ROTATION_PHASES.length - 1;
        const stateWord = state === 'done' ? 'Completed' : state === 'active' ? 'Current' : 'Upcoming';
        return (
          <li
            key={p}
            className="flex flex-1 flex-col items-center"
            aria-current={state === 'active' ? 'step' : undefined}
          >
            <span className="sr-only">{`${PHASE_LABEL[p]}: ${stateWord}`}</span>
            <div className="flex w-full items-center" aria-hidden="true">
              <span className="h-px flex-1 bg-transparent" />
              <span
                className={cn(
                  'tnum flex shrink-0 items-center justify-center rounded-full border text-[length:var(--fs-micro)] font-semibold',
                  dot,
                  state === 'done' && 'border-accent bg-accent text-white',
                  state === 'active' && 'border-accent text-accent-text',
                  state === 'upcoming' && 'border-border text-text-tertiary',
                )}
              >
                {state === 'done' ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
              </span>
              <span className={cn('h-px flex-1', isLast ? 'bg-transparent' : i < current ? 'bg-accent' : 'bg-border')} />
            </div>
            <span
              aria-hidden="true"
              className={cn(
                'mt-1.5 text-center text-[length:var(--fs-micro)]',
                state === 'upcoming' ? 'text-text-tertiary' : 'text-text-secondary',
                state === 'active' && 'font-medium text-text',
              )}
            >
              {PHASE_LABEL[p]}
            </span>
            {state === 'active' && (
              <span aria-hidden="true" className="mt-1 h-1 w-12 overflow-hidden rounded-full bg-surface-2">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.round(phaseProgress * 100)}%` }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export { PHASE_LABEL };

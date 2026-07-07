import { Fragment } from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Step {
  id: string;
  label: string;
}

/**
 * A horizontal step indicator that exposes current/total to assistive tech.
 * `currentComplete` marks the active step as finished (check + filled) without
 * advancing — used when a step's work is done but its results are still on screen.
 */
export function Stepper({
  steps,
  current,
  currentComplete = false,
}: {
  steps: Step[];
  current: number;
  currentComplete?: boolean;
}) {
  return (
    <ol
      className="flex items-center gap-2"
      aria-label={`Step ${current + 1} of ${steps.length}`}
    >
      {steps.map((step, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'upcoming';
        const showDone = state === 'done' || (state === 'current' && currentComplete);
        return (
          <Fragment key={step.id}>
            <li className="flex items-center gap-2" aria-current={state === 'current' ? 'step' : undefined}>
              <span
                className={cn(
                  'tnum flex h-7 w-7 items-center justify-center rounded-full border text-[length:var(--fs-small)] font-medium',
                  showDone && 'border-accent bg-accent text-white',
                  state === 'current' && !currentComplete && 'border-accent text-accent-text',
                  state === 'upcoming' && 'border-border text-text-tertiary',
                )}
              >
                {showDone ? <Check className="h-4 w-4" aria-hidden="true" /> : i + 1}
              </span>
              <span
                className={cn(
                  'text-[length:var(--fs-small)]',
                  state === 'upcoming' ? 'text-text-tertiary' : 'text-text',
                )}
              >
                {step.label}
                {state === 'current' && currentComplete && <span className="sr-only"> (complete)</span>}
              </span>
            </li>
            {i < steps.length - 1 && (
              <li
                aria-hidden="true"
                className={cn('h-0.5 w-8 flex-none sm:w-12', i < current ? 'bg-accent' : 'bg-border')}
              />
            )}
          </Fragment>
        );
      })}
    </ol>
  );
}

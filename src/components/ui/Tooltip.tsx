import { type ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return (
    <RadixTooltip.Provider delayDuration={300} skipDelayDuration={150}>
      {children}
    </RadixTooltip.Provider>
  );
}

/** A themed tooltip. Content is supplementary; never the only way to get info. */
export function Tooltip({
  content,
  side = 'top',
  children,
}: {
  content: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  children: ReactNode;
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-[var(--z-tooltip)] max-w-xs rounded-[var(--r-sm)] border border-border-strong bg-surface-2 px-2.5 py-1.5 text-[length:var(--fs-small)] text-text shadow-[var(--shadow-md)] data-[state=delayed-open]:motion-safe:animate-[acv-skeleton_0ms]"
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--surface-2)]" />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

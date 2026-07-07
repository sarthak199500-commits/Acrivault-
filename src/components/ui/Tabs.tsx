import { type ReactNode } from 'react';
import * as RadixTabs from '@radix-ui/react-tabs';
import { cn } from '@/lib/cn';

export interface TabDef {
  value: string;
  label: ReactNode;
}

export function Tabs({
  value,
  onValueChange,
  tabs,
  children,
  className,
}: {
  value: string;
  onValueChange: (value: string) => void;
  tabs: TabDef[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <RadixTabs.Root value={value} onValueChange={onValueChange} className={className}>
      <RadixTabs.List className="mb-4 flex items-center gap-1 border-b border-border">
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className={cn(
              '-mb-px border-b-2 px-3 py-2 text-[length:var(--fs-small)] font-medium outline-none',
              'border-transparent text-text-secondary hover:text-text',
              'data-[state=active]:border-accent data-[state=active]:text-text',
              'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
            )}
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

export const TabPanel = RadixTabs.Content;

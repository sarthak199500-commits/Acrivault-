import { type ReactNode } from 'react';
import * as Radix from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface AccordionItemDef {
  value: string;
  title: ReactNode;
  content: ReactNode;
}

/** A styled Radix Accordion (single or multiple open). */
export function Accordion({
  items,
  type = 'single',
  defaultValue,
  className,
}: {
  items: AccordionItemDef[];
  type?: 'single' | 'multiple';
  defaultValue?: string;
  className?: string;
}) {
  const common = {
    className: cn('divide-y divide-border overflow-hidden rounded-[var(--r-md)] border border-border', className),
  };
  const content = items.map((item) => (
    <Radix.Item key={item.value} value={item.value} className="bg-surface">
      <Radix.Header>
        <Radix.Trigger
          className={cn(
            'group flex w-full items-center justify-between gap-3 px-4 py-3 text-left outline-none',
            'text-[length:var(--fs-small)] font-medium text-text hover:bg-surface-hover',
            'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--accent)_35%,transparent)]',
          )}
        >
          {item.title}
          <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary transition-transform group-data-[state=open]:rotate-180" aria-hidden="true" />
        </Radix.Trigger>
      </Radix.Header>
      <Radix.Content className="px-4 pb-3 text-[length:var(--fs-small)] text-text-secondary">
        {item.content}
      </Radix.Content>
    </Radix.Item>
  ));

  return type === 'single' ? (
    <Radix.Root type="single" collapsible defaultValue={defaultValue} {...common}>
      {content}
    </Radix.Root>
  ) : (
    <Radix.Root type="multiple" defaultValue={defaultValue ? [defaultValue] : undefined} {...common}>
      {content}
    </Radix.Root>
  );
}

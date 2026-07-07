/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- the code pane is a scrollable read-only region and must be keyboard-focusable (axe: scrollable-region-focusable) */
import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Read-only monospace code panel (illustrative policy code, provenance values). */
export function CodeBlock({
  code,
  label,
  className,
}: {
  code: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className={cn('overflow-hidden rounded-[var(--r-md)] border border-border bg-surface-2', className)}>
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="eyebrow">{label ?? 'Generated · read-only'}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-[length:var(--fs-micro)] text-text-tertiary hover:text-text"
        >
          {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        tabIndex={0}
        role="region"
        aria-label={label ?? 'Code'}
        className="overflow-auto p-3 font-mono text-[length:var(--fs-code)] leading-relaxed text-text-secondary outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]"
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}

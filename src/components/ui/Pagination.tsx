import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Build a compact page list with ellipses, e.g. 1 … 4 5 6 … 20. */
function pageItems(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1);
  const items: (number | 'gap')[] = [1];
  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);
  if (start > 2) items.push('gap');
  for (let i = start; i <= end; i++) items.push(i);
  if (end < pageCount - 1) items.push('gap');
  items.push(pageCount);
  return items;
}

export function Pagination({
  page,
  pageCount,
  onPageChange,
  className,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  className?: string;
}) {
  if (pageCount <= 1) return null;
  const items = pageItems(page, pageCount);
  const btn =
    'inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--r-sm)] border px-2 text-[length:var(--fs-small)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        type="button"
        className={cn(btn, 'border-border bg-surface text-text-secondary hover:bg-surface-hover')}
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((it, i) =>
        it === 'gap' ? (
          <span key={`gap-${i}`} className="px-1 text-text-tertiary" aria-hidden="true">…</span>
        ) : (
          <button
            key={it}
            type="button"
            onClick={() => onPageChange(it)}
            aria-current={it === page ? 'page' : undefined}
            className={cn(
              btn,
              'tnum',
              it === page
                ? 'border-accent bg-accent-tint font-medium text-accent-text'
                : 'border-border bg-surface text-text-secondary hover:bg-surface-hover hover:text-text',
            )}
          >
            {it}
          </button>
        ),
      )}
      <button
        type="button"
        className={cn(btn, 'border-border bg-surface text-text-secondary hover:bg-surface-hover')}
        onClick={() => onPageChange(page + 1)}
        disabled={page >= pageCount}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

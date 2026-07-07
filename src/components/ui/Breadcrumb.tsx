import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Crumb {
  label: string;
  to?: string;
}

/** A breadcrumb trail. The last crumb is the current page (aria-current). */
export function Breadcrumb({ items, className }: { items: Crumb[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1.5 text-[length:var(--fs-small)]">
        {items.map((item, i) => {
          const isLast = i === items.length - 1;
          return (
            <Fragment key={i}>
              <li>
                {item.to && !isLast ? (
                  <Link to={item.to} className="text-text-tertiary hover:text-text">{item.label}</Link>
                ) : (
                  <span className={cn(isLast ? 'text-text' : 'text-text-tertiary')} aria-current={isLast ? 'page' : undefined}>
                    {item.label}
                  </span>
                )}
              </li>
              {!isLast && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
  elevated?: boolean;
}

export function Card({ className, inset, elevated, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-[var(--r-lg)] border border-border bg-surface',
        elevated && 'shadow-[var(--shadow-md)]',
        inset && 'bg-surface-2',
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 px-5 pt-4 pb-3', className)}>
      <div className="min-w-0">
        <h2 className="text-[length:var(--fs-h2)] font-semibold leading-[var(--lh-h2)] text-text">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-[length:var(--fs-small)] text-text-secondary">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('flex items-center gap-2 border-t border-border px-5 py-3', className)}
      {...props}
    />
  );
}

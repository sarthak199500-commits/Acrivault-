import { type ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { useUiStore } from '@/stores/ui';
import { ErrorState } from './ErrorState';
import { SkeletonText } from './Skeleton';

/**
 * The single four-states wrapper. Takes a TanStack Query result and renders
 * loading / empty / error / populated so a data view can never flash blank.
 * It is scenario-aware: the dev Scenario Switcher can force any state without
 * code edits.
 */
export interface QueryBoundaryProps<T> {
  query: UseQueryResult<T>;
  /** Skeleton shaped like the eventual content (not a centered spinner). */
  loadingFallback?: ReactNode;
  /** Shown when the data is present but empty. */
  empty?: ReactNode;
  /** Decide whether resolved data counts as empty. */
  isEmpty?: (data: T) => boolean;
  children: (data: T) => ReactNode;
}

export function QueryBoundary<T>({
  query,
  loadingFallback,
  empty,
  isEmpty,
  children,
}: QueryBoundaryProps<T>) {
  const forcedState = useUiStore((s) => s.scenario.state);
  // The forced loading/error/empty states are a dev-only affordance driven by the
  // Scenario Switcher. Gate them behind DEV so their synthetic copy is tree-shaken
  // out of production and a real query is the only thing that can drive these states.
  const forced = import.meta.env.DEV ? forcedState : undefined;

  if (forced === 'loading') {
    return <>{loadingFallback ?? <SkeletonText lines={6} />}</>;
  }
  if (forced === 'error') {
    return (
      <ErrorState
        message="Synthetic failure forced by the scenario switcher."
        detail="scenario.state = 'error'"
        onRetry={() => query.refetch()}
      />
    );
  }

  if (query.isPending) {
    return <>{loadingFallback ?? <SkeletonText lines={6} />}</>;
  }
  if (query.isError) {
    const detail = query.error instanceof Error ? query.error.message : String(query.error);
    return (
      <ErrorState
        message="We couldn't load this view."
        detail={detail}
        onRetry={() => query.refetch()}
      />
    );
  }

  const data = query.data;
  const treatEmpty = forced === 'empty' || (isEmpty ? isEmpty(data) : false);
  if (treatEmpty && empty) {
    return <>{empty}</>;
  }

  return <>{children(data)}</>;
}

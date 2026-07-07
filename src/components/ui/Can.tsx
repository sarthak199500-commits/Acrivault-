import { type ReactNode } from 'react';
import { can, type Capability } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';

/** Renders children only if the active role holds the capability. */
export function Can({
  capability,
  fallback = null,
  children,
}: {
  capability: Capability;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const role = useUiStore((s) => s.role);
  return <>{can(role, capability) ? children : fallback}</>;
}

/** Hook form, for when a component needs the boolean directly. */
export function useCan(capability: Capability): boolean {
  const role = useUiStore((s) => s.role);
  return can(role, capability);
}

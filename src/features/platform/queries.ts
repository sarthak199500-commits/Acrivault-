import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConnections,
  getSessionPolicy,
  getSourceHealth,
  listAudit,
  updateSessionPolicy,
  listNotifications,
  listUsers,
  markNotificationRead,
  updateUserRole,
  type AuditFilter,
} from '@/mocks/api';
import type { Role } from '@/lib/permissions';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: listUsers });
}

export function useConnections() {
  return useQuery({ queryKey: ['connections'], queryFn: getConnections });
}

export function useSourceHealth() {
  return useQuery({ queryKey: ['source-health'], queryFn: getSourceHealth });
}

export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) => updateUserRole(id, role),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
}

/**
 * The filter object is the query key, so each combination caches separately and
 * TanStack's structural hashing makes an equal-but-new object a cache hit rather
 * than a refetch on every keystroke.
 */
export function useAudit(filter: AuditFilter = {}) {
  return useQuery({ queryKey: ['audit', filter], queryFn: () => listAudit(filter) });
}

export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: listNotifications });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useSessionPolicy() {
  return useQuery({ queryKey: ['session-policy'], queryFn: getSessionPolicy });
}

export function useUpdateSessionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSessionPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['session-policy'] });
      // The change is audited, so the log a reader may have open is now stale.
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

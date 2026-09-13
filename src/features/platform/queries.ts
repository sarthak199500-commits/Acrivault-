import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConnections,
  getNotificationPrefs,
  getSourceHealth,
  listAudit,
  listNotifications,
  listUsers,
  markAllNotificationsRead,
  setNotificationRead,
  transferOwnership,
  updateNotificationPrefs,
  updateUserRole,
  type AuditFilter,
} from '@/mocks/api';
import type { Role } from '@/lib/permissions';
import type { NotificationPrefs } from '@/mocks/types';

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

export function useSetNotificationRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, read }: { id: string; read: boolean }) => setNotificationRead(id, read),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
}

// Named, because the optimistic writes below have to address the exact same
// entry the reader subscribes to — a retyped literal that drifts is a rollback
// that silently restores nothing.
const PREFS_KEY = ['notification-prefs'] as const;

export function useNotificationPrefs() {
  return useQuery({ queryKey: PREFS_KEY, queryFn: getNotificationPrefs });
}

/**
 * Save delivery choices, optimistically.
 *
 * These are Radix switches bound to server state, so with a plain
 * invalidate-and-refetch the control does not move until the write AND the
 * refetch have both cleared the simulated latency — most of a second and a half
 * in which the switch visibly ignores the click. Painting the new value first,
 * then replacing the cache with the server's own response, means one round trip
 * and no dead interval. A failure rolls back to the snapshot, and the screen's
 * onError toast says why.
 */
export function useUpdateNotificationPrefs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateNotificationPrefs,
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: PREFS_KEY });
      const previous = qc.getQueryData<NotificationPrefs>(PREFS_KEY);
      if (previous) {
        qc.setQueryData<NotificationPrefs>(PREFS_KEY, {
          categories: { ...previous.categories, ...(patch.categories ?? {}) },
          digest: { ...previous.digest, ...(patch.digest ?? {}) },
        });
      }
      return { previous };
    },
    onError: (_err, _patch, context) => {
      if (context?.previous) qc.setQueryData(PREFS_KEY, context.previous);
    },
    onSuccess: (saved) => {
      // The server's own response, so the cache ends up holding what was
      // stored rather than what the optimistic pass guessed.
      qc.setQueryData(PREFS_KEY, saved);
      // The change is audited, so a log a reader has open is now stale.
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

/** Ownership moves two people's roles at once, so the user list is refetched whole. */
export function useTransferOwnership() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) => transferOwnership(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: ['tenant'] });
      qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

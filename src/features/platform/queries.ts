import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getConnections,
  getSourceHealth,
  listAudit,
  listNotifications,
  listUsers,
  markNotificationRead,
  updateUserRole,
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

export function useAudit(search?: string) {
  return useQuery({ queryKey: ['audit', search ?? ''], queryFn: () => listAudit(search) });
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

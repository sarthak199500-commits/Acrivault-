import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateUser,
  assignRole,
  deleteUser,
  editUser,
  getTenant,
  listUsers,
  suspendUser,
  syncUsers,
  type UserPatch,
} from '@/mocks/api';
import type { Role } from '@/lib/permissions';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: listUsers });
}

export function useTenant() {
  return useQuery({ queryKey: ['tenant'], queryFn: getTenant });
}

/** Invalidate the user list (and the audit trail, which every mutation writes to). */
function useUserInvalidation() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['users'] });
    void qc.invalidateQueries({ queryKey: ['audit'] });
  };
}

/**
 * Pull from Entra now. Also invalidates the tenant, because a sync moves the
 * last-synced timestamp the SSO screen reports.
 */
export function useSyncUsers() {
  const qc = useQueryClient();
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: syncUsers,
    onSuccess: () => {
      invalidate();
      void qc.invalidateQueries({ queryKey: ['tenant'] });
    },
  });
}

export function useAssignRole() {
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: ({ ids, role }: { ids: string[]; role: Role }) => assignRole(ids, role),
    onSuccess: invalidate,
  });
}

export function useEditUser() {
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UserPatch }) => editUser(id, patch),
    onSuccess: invalidate,
  });
}

export function useSuspendUser() {
  const invalidate = useUserInvalidation();
  return useMutation({ mutationFn: (id: string) => suspendUser(id), onSuccess: invalidate });
}

export function useActivateUser() {
  const invalidate = useUserInvalidation();
  return useMutation({ mutationFn: (id: string) => activateUser(id), onSuccess: invalidate });
}

export function useDeleteUser() {
  const invalidate = useUserInvalidation();
  return useMutation({ mutationFn: (id: string) => deleteUser(id), onSuccess: invalidate });
}

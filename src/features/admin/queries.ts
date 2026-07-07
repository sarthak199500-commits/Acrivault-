import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activateUser,
  createGroup,
  deleteUser,
  editUser,
  getTenant,
  inviteUser,
  listGroups,
  listUsers,
  resendInvite,
  suspendUser,
  type InvitePayload,
  type UserPatch,
} from '@/mocks/api';

export function useUsers() {
  return useQuery({ queryKey: ['users'], queryFn: listUsers });
}

export function useGroups() {
  return useQuery({ queryKey: ['groups'], queryFn: listGroups });
}

export function useTenant() {
  return useQuery({ queryKey: ['tenant'], queryFn: getTenant });
}

/** Invalidate the user list (and groups, whose member counts may change). */
function useUserInvalidation() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['users'] });
    void qc.invalidateQueries({ queryKey: ['groups'] });
    void qc.invalidateQueries({ queryKey: ['audit'] });
  };
}

export function useInviteUser() {
  const invalidate = useUserInvalidation();
  return useMutation({
    mutationFn: (payload: InvitePayload) => inviteUser(payload),
    onSuccess: invalidate,
  });
}

export function useResendInvite() {
  return useMutation({ mutationFn: (id: string) => resendInvite(id) });
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

export function useCreateGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ name, description }: { name: string; description?: string }) =>
      createGroup(name, description),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['groups'] }),
  });
}

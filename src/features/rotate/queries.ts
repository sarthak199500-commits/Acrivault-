import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getIdentity, getRotationJob, listRotationCandidates, listRotations, requestRotation } from '@/mocks/api';

export function useRotations() {
  return useQuery({ queryKey: ['rotations'], queryFn: listRotations });
}

export function useRotationJob(id: string | undefined) {
  return useQuery({ queryKey: ['rotation', id], queryFn: () => getRotationJob(id as string), enabled: !!id });
}

export function useRotationIdentity(id: string | undefined) {
  return useQuery({ queryKey: ['identity', id], queryFn: () => getIdentity(id as string), enabled: !!id });
}

export function useRotationCandidates() {
  return useQuery({ queryKey: ['rotation-candidates'], queryFn: () => listRotationCandidates(40) });
}

export function useStartRotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ identityId, mode }: { identityId: string; mode: 'standard' | 'emergency' }) =>
      requestRotation(identityId, mode),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['rotations'] }),
  });
}

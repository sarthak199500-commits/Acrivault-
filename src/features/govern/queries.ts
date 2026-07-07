import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activatePolicy,
  evaluatePolicy,
  getPolicy,
  listPolicies,
  savePolicy,
  type PolicySaveInput,
} from '@/mocks/api';
import type { PolicyToken } from '@/mocks/types';

export function usePolicies() {
  return useQuery({ queryKey: ['policies'], queryFn: listPolicies });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(id as string),
    enabled: !!id,
  });
}

/** Evaluate a draft rule's tokens for the live affected-count and Test action. */
export function useEvaluate(tokens: PolicyToken[]) {
  return useQuery({
    queryKey: ['policy-eval', tokens],
    queryFn: () => evaluatePolicy(tokens),
  });
}

export function useSavePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: PolicySaveInput) => savePolicy(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }),
  });
}

export function useActivatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => activatePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['policies'] });
    },
  });
}

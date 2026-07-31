import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  activatePolicy,
  archivePolicy,
  getPolicy,
  listPolicies,
  savePolicy,
  suspendPolicy,
  testPolicy,
  evaluatePolicy,
  type PolicySaveInput,
} from '@/mocks/api';
import type { PolicyToken } from '@/mocks/types';

export function usePolicies(includeArchived = false) {
  return useQuery({
    queryKey: ['policies', includeArchived],
    queryFn: () => listPolicies({ includeArchived }),
  });
}

export function usePolicy(id: string | undefined) {
  return useQuery({
    queryKey: ['policy', id],
    queryFn: () => getPolicy(id as string),
    enabled: !!id,
  });
}

/** Evaluate a draft rule's tokens for the live affected-count. Persists nothing. */
export function useEvaluate(tokens: PolicyToken[]) {
  return useQuery({
    queryKey: ['policy-eval', tokens],
    queryFn: () => evaluatePolicy(tokens),
  });
}

/** Invalidate every policy view after a write, whatever its archived filter. */
function useInvalidatePolicies() {
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ['policies'] });
    void qc.invalidateQueries({ queryKey: ['policy'] });
    void qc.invalidateQueries({ queryKey: ['audit'] });
  };
}

export function useSavePolicy() {
  const invalidate = useInvalidatePolicies();
  return useMutation({
    mutationFn: (input: PolicySaveInput) => savePolicy(input),
    onSuccess: invalidate,
  });
}

/** Dry-run and record the passing test that activation depends on (FR-004/FR-005). */
export function useTestPolicy() {
  const invalidate = useInvalidatePolicies();
  return useMutation({
    mutationFn: (input: PolicySaveInput) => testPolicy(input),
    onSuccess: invalidate,
  });
}

export function useActivatePolicy() {
  const invalidate = useInvalidatePolicies();
  return useMutation({
    mutationFn: (id: string) => activatePolicy(id),
    onSuccess: invalidate,
  });
}

export function useSuspendPolicy() {
  const invalidate = useInvalidatePolicies();
  return useMutation({
    mutationFn: (id: string) => suspendPolicy(id),
    onSuccess: invalidate,
  });
}

export function useArchivePolicy() {
  const invalidate = useInvalidatePolicies();
  return useMutation({
    mutationFn: (id: string) => archivePolicy(id),
    onSuccess: invalidate,
  });
}

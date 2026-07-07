import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acknowledgeAlert, getAlert, getIdentity, listAlerts, resolveAlert } from '@/mocks/api';
import type { RiskBand } from '@/mocks/types';

export function useAlerts(severity?: RiskBand) {
  return useQuery({ queryKey: ['alerts', severity ?? 'all'], queryFn: () => listAlerts(severity) });
}

export function useAlert(id: string | undefined) {
  return useQuery({ queryKey: ['alert', id], queryFn: () => getAlert(id as string), enabled: !!id });
}

export function useAlertIdentity(id: string | undefined) {
  return useQuery({ queryKey: ['identity', id], queryFn: () => getIdentity(id as string), enabled: !!id });
}

export function useAlertActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['alerts'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
  };
  return {
    acknowledge: useMutation({ mutationFn: (id: string) => acknowledgeAlert(id), onSuccess: invalidate }),
    resolve: useMutation({ mutationFn: (id: string) => resolveAlert(id), onSuccess: invalidate }),
  };
}

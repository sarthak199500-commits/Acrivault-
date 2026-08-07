import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeAlert,
  getAlert,
  getIdentity,
  getLatestSessionForIdentity,
  getMonitoringBaseline,
  listAlerts,
  resolveAlert,
} from '@/mocks/api';
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

export function useMonitoringBaseline() {
  return useQuery({ queryKey: ['monitoring-baseline'], queryFn: getMonitoringBaseline });
}

/**
 * The agent session behind an alert. Only AI agents have one, so callers gate on the
 * identity's type — asking for a service account's session would always be a miss.
 */
export function useAlertSession(identityId: string | undefined, isAgent: boolean) {
  return useQuery({
    queryKey: ['identity-session', identityId],
    queryFn: () => getLatestSessionForIdentity(identityId as string),
    enabled: !!identityId && isAgent,
  });
}

export function useAlertActions() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['alerts'] });
    qc.invalidateQueries({ queryKey: ['overview'] });
    qc.invalidateQueries({ queryKey: ['monitoring-baseline'] });
    // Acknowledge and resolve both write to the audit trail (FRS 3.7).
    qc.invalidateQueries({ queryKey: ['audit'] });
  };
  return {
    acknowledge: useMutation({ mutationFn: (id: string) => acknowledgeAlert(id), onSuccess: invalidate }),
    resolve: useMutation({ mutationFn: (id: string) => resolveAlert(id), onSuccess: invalidate }),
  };
}

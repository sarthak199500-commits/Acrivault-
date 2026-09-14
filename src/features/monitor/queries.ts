import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acknowledgeAlert,
  getAlert,
  getIdentity,
  getMonitoringBaseline,
  getSession,
  listAlerts,
  resolveAlert,
} from '@/mocks/api';
import type { AlertQuery } from '@/mocks/api';

export function useAlerts(query: AlertQuery = {}) {
  return useQuery({
    queryKey: ['alerts', query.severity ?? 'all', query.source ?? 'all'],
    queryFn: () => listAlerts(query),
  });
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
 * The session an alert was raised on. Keyed on the alert's own `sessionId`, so the
 * panel shows the trace that caused the alert rather than whatever the agent
 * happened to run most recently.
 */
export function useAlertSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => getSession(sessionId as string),
    enabled: !!sessionId,
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

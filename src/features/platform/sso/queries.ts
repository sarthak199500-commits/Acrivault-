import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  generateScimToken,
  getTenant,
  saveSamlConfig,
  setPasswordFallback,
  testSamlSignIn,
} from '@/mocks/api';
import { scimStatus, scimUnlocked, type SamlDraft } from '@/lib/sso';
import type { Tenant } from '@/mocks/types';

/** How often to look for Entra's first provisioning call while waiting for it. */
const WATCH_MS = 2000;

/**
 * The tenant, polled only while Entra still owes us its first provisioning call.
 * Entra's own "Test connection" hits the SCIM endpoint, so the screen watches for
 * that rather than asking the admin to press a button for something the server
 * already knows. Shares the `tenant` query key, so every other screen sees the
 * same record and the poll stops the moment the call lands.
 */
export function useTenantLive() {
  return useQuery({
    queryKey: ['tenant'],
    queryFn: getTenant,
    refetchInterval: (query) => {
      const t = query.state.data;
      if (!t) return false;
      return scimStatus(t.scim) === 'waiting' && scimUnlocked(t.saml, new Date()) ? WATCH_MS : false;
    },
    // Keep watching while the tab is in the background: the admin is over in the
    // Azure portal pressing Test connection, which is the very call we're waiting
    // for. Pausing the poll there would strand the card on "waiting".
    refetchIntervalInBackground: true,
  });
}

/**
 * Every SSO mutation returns the tenant it just changed, so the cache is written
 * from the response rather than refetched — the status pills must never lag the
 * action that moved them.
 */
function useTenantMutation<TArgs, TResult extends Tenant | { tenant: Tenant }>(
  fn: (args: TArgs) => Promise<TResult>,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result: TResult) => {
      qc.setQueryData(['tenant'], 'tenant' in result ? result.tenant : result);
      void qc.invalidateQueries({ queryKey: ['audit'] });
    },
  });
}

export function useSaveSaml() {
  return useTenantMutation((draft: SamlDraft) => saveSamlConfig(draft));
}

export function useTestSignIn() {
  return useTenantMutation(() => testSamlSignIn());
}

export function useGenerateScimToken() {
  return useTenantMutation(() => generateScimToken());
}

export function useSetPasswordFallback() {
  return useTenantMutation((on: boolean) => setPasswordFallback(on));
}

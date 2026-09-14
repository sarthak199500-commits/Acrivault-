import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { AlertSource } from '@/mocks/api';
import type { RiskBand } from '@/mocks/types';

const BANDS: RiskBand[] = ['critical', 'high', 'medium', 'low', 'minimal'];

/**
 * Monitor's feed filters, kept in the URL like the inventory's — so the baseline strip
 * can deep-link into a filtered feed, the back button undoes it, and a triaging analyst
 * can share what they are looking at.
 *
 * Three orthogonal dimensions: severity, what raised the alert, and whether it was
 * raised while its identity's baseline was still forming.
 */
export function useMonitorFilters() {
  const [params, setParams] = useSearchParams();

  const severity = useMemo<RiskBand | null>(() => {
    const raw = params.get('sev');
    return raw && (BANDS as string[]).includes(raw) ? (raw as RiskBand) : null;
  }, [params]);

  const source = useMemo<AlertSource | null>(() => {
    const raw = params.get('src');
    return raw === 'policy' || raw === 'behavior' ? raw : null;
  }, [params]);

  const learningOnly = params.get('baseline') === 'learning';

  const write = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(params);
      mutate(next);
      setParams(next, { replace: true });
    },
    [params, setParams],
  );

  const setSeverity = useCallback(
    (band: RiskBand | null) =>
      write((next) => {
        if (band) next.set('sev', band);
        else next.delete('sev');
      }),
    [write],
  );

  /**
   * Narrow to alerts a rule raised, or to those the baseline raised. Severity is left
   * alone: unlike the learning link this pill states no count of its own, so
   * intersecting the two cannot strand the analyst on a feed that contradicts a number
   * they just clicked.
   */
  const setSource = useCallback(
    (next: AlertSource | null) =>
      write((params) => {
        if (next) params.set('src', next);
        else params.delete('src');
      }),
    [write],
  );

  /**
   * Focus the alerts raised during a learning window. Severity is cleared rather than
   * intersected: the strip's link states a count, and intersecting could land on a feed
   * that does not contain that many rows — or none at all.
   */
  const showLearningOnly = useCallback(
    () =>
      write((next) => {
        next.delete('sev');
        next.set('baseline', 'learning');
      }),
    [write],
  );

  const clearLearningOnly = useCallback(
    () => write((next) => next.delete('baseline')),
    [write],
  );

  return { severity, setSeverity, source, setSource, learningOnly, showLearningOnly, clearLearningOnly };
}

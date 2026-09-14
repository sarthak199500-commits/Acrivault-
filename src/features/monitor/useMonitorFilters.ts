import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { NHI_TYPES, type NhiType, type RiskBand } from '@/mocks/types';

const BANDS: RiskBand[] = ['critical', 'high', 'medium', 'low', 'minimal'];

/**
 * Every URL key the feed's filters own, listed once. `clearAll` wipes the whole set in
 * a single write: each setter rebuilds the query string from the same render's snapshot
 * of it, so clearing three keys with three calls lets the last write win and quietly
 * restores the first two.
 */
const FILTER_KEYS = ['sev', 'itype', 'baseline'];

/**
 * Identity type rides on `itype`, not `type`. FRS 3.7 asks the feed to carry the type
 * of *anomaly*, which `Alert` has no field for yet; when that lands it should own the
 * obvious key rather than inherit a migration.
 */
const TYPE_KEY = 'itype';

/**
 * Monitor's feed filters, kept in the URL like the inventory's — so the baseline strip
 * can deep-link into a filtered feed, the back button undoes it, and a triaging analyst
 * can share what they are looking at.
 *
 * Three orthogonal dimensions: severity, the identity's type, and whether the alert was
 * raised while its identity's baseline was still forming.
 */
export function useMonitorFilters() {
  const [params, setParams] = useSearchParams();

  const severity = useMemo<RiskBand | null>(() => {
    const raw = params.get('sev');
    return raw && (BANDS as string[]).includes(raw) ? (raw as RiskBand) : null;
  }, [params]);

  const identityTypes = useMemo<NhiType[]>(() => parseTypes(params.get(TYPE_KEY)), [params]);

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

  const toggleIdentityType = useCallback(
    (type: NhiType) =>
      write((next) => {
        const current = parseTypes(next.get(TYPE_KEY));
        const list = current.includes(type)
          ? current.filter((t) => t !== type)
          : [...current, type];
        if (list.length) next.set(TYPE_KEY, list.join(','));
        else next.delete(TYPE_KEY);
      }),
    [write],
  );

  const clearIdentityTypes = useCallback(() => write((next) => next.delete(TYPE_KEY)), [write]);

  /**
   * Focus the alerts raised during a learning window. The other dimensions are cleared
   * rather than intersected: the strip's link states a count, and intersecting could
   * land on a feed that does not contain that many rows — or none at all.
   */
  const showLearningOnly = useCallback(
    () =>
      write((next) => {
        next.delete('sev');
        next.delete(TYPE_KEY);
        next.set('baseline', 'learning');
      }),
    [write],
  );

  const clearLearningOnly = useCallback(() => write((next) => next.delete('baseline')), [write]);

  const clearAll = useCallback(
    () => write((next) => FILTER_KEYS.forEach((key) => next.delete(key))),
    [write],
  );

  const anyActive = severity !== null || learningOnly || identityTypes.length > 0;

  return {
    severity,
    setSeverity,
    identityTypes,
    toggleIdentityType,
    clearIdentityTypes,
    learningOnly,
    showLearningOnly,
    clearLearningOnly,
    clearAll,
    anyActive,
  };
}

function parseTypes(raw: string | null): NhiType[] {
  if (!raw) return [];
  return raw.split(',').filter((v): v is NhiType => (NHI_TYPES as string[]).includes(v));
}

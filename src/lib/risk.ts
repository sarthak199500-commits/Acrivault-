import type { RiskBand } from '@/mocks/types';

/**
 * Score-to-band mapping. This is a DISPLAY mapping over a precomputed score,
 * not a scoring algorithm. The score itself is produced upstream.
 * // ASSUMPTION: band thresholds (Risk-score derivation, bands, and thresholds).
 */
export interface RiskBandMeta {
  band: RiskBand;
  label: string;
  /** Tailwind text color utility resolving to the risk token. */
  colorVar: string;
  /** Token color var name, for inline SVG/chart fills. */
  cssVar: string;
}

const BANDS: { min: number; meta: RiskBandMeta }[] = [
  { min: 80, meta: { band: 'critical', label: 'Critical', colorVar: 'text-risk-critical', cssVar: 'var(--risk-critical)' } },
  { min: 60, meta: { band: 'high', label: 'High', colorVar: 'text-risk-high', cssVar: 'var(--risk-high)' } },
  { min: 40, meta: { band: 'medium', label: 'Medium', colorVar: 'text-risk-medium', cssVar: 'var(--risk-medium)' } },
  { min: 20, meta: { band: 'low', label: 'Low', colorVar: 'text-risk-low', cssVar: 'var(--risk-low)' } },
  { min: 0, meta: { band: 'minimal', label: 'Minimal', colorVar: 'text-risk-minimal', cssVar: 'var(--risk-minimal)' } },
];

/** Map a 0..100 precomputed score to its band metadata. */
export function riskBand(score: number): RiskBandMeta {
  const clamped = Math.max(0, Math.min(100, score));
  for (const { min, meta } of BANDS) {
    if (clamped >= min) return meta;
  }
  return BANDS[BANDS.length - 1].meta;
}

/** Look up band metadata directly from a band name (when score is not at hand). */
export function bandMeta(band: RiskBand): RiskBandMeta {
  const found = BANDS.find((b) => b.meta.band === band);
  return found ? found.meta : BANDS[BANDS.length - 1].meta;
}

export const RISK_BAND_ORDER: RiskBand[] = ['critical', 'high', 'medium', 'low', 'minimal'];

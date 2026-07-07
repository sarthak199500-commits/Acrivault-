import { ArrowDown, ArrowUp, Minus, type LucideIcon } from 'lucide-react';
import { riskBand } from '@/lib/risk';
import type { RiskBand } from '@/mocks/types';
import { cn } from '@/lib/cn';

/**
 * Takes a 0..100 precomputed score, maps it to a band (lib/risk.ts), and shows
 * the band label with the number. It never recomputes — only maps. Color always
 * pairs with the label and a direction glyph (never color alone). The pill uses the
 * contrast-tuned semantic token triplets so text passes AA in both themes.
 */
const BAND_TONE: Record<RiskBand, string> = {
  critical: 'bg-crit-bg text-crit-fg',
  high: 'bg-warn-bg text-warn-fg',
  medium: 'bg-warn-bg text-warn-fg',
  low: 'bg-ok-bg text-ok-fg',
  minimal: 'bg-neutral-bg text-neutral-fg',
};

// A severity-direction marker: elevated bands point up, low points down, the
// middle reads flat. Conveys magnitude at a glance alongside the label.
const BAND_GLYPH: Record<RiskBand, LucideIcon> = {
  critical: ArrowUp,
  high: ArrowUp,
  medium: Minus,
  low: ArrowDown,
  minimal: Minus,
};

export function RiskPill({
  score,
  showScore = true,
  size = 'md',
  className,
}: {
  score: number;
  showScore?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}) {
  const meta = riskBand(score);
  const Glyph = BAND_GLYPH[meta.band];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--r-pill)] font-medium',
        BAND_TONE[meta.band],
        size === 'sm' ? 'px-2 py-0.5 text-[length:var(--fs-small)]' : 'px-2.5 py-0.5 text-[length:var(--fs-small)]',
        className,
      )}
      title={`Risk ${meta.label} (${score})`}
    >
      <Glyph className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{meta.label}</span>
      {showScore && <span className="tnum font-semibold">{score}</span>}
    </span>
  );
}

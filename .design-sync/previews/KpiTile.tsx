import type { ReactNode } from 'react';
import { KpiTile, NhiTypeIcon } from 'acrivault';
import { Activity, AlertTriangle, RefreshCw, Unlink } from 'lucide-react';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based.
 *
 * KpiTile is `h-full flex-col` — it is built to fill a grid cell rather than size
 * itself — so every frame here supplies an explicit grid track. Note the `to`
 * prop is deliberately absent from all stories: it renders a react-router
 * <Link>, and the preview harness mounts no Router, so a linked tile would throw
 * rather than render. See .design-sync/learnings/status.md. */
function Grid({ children, cols = 2, track = 180 }: { children: ReactNode; cols?: number; track?: number }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, minmax(${track}px, 1fr))`,
        gap: 12,
        maxWidth: cols * (track + 30),
      }}
    >
      {children}
    </div>
  );
}

/** The plain tile: label, compact-formatted value, and a chip icon. Numbers pass
 *  through `compact()`, so 1284 renders as 1.3K. */
export function Default() {
  return (
    <Grid>
      <KpiTile label="Total identities" value={2243} icon={<NhiTypeIcon type="service-account" className="h-4 w-4" />} />
      <KpiTile label="Last scan" value="6 min ago" icon={<RefreshCw className="h-4 w-4" />} />
    </Grid>
  );
}

/** Delta tone follows *favourability*, not sign. `deltaInverted` flips it for
 *  lower-is-better metrics, so a rising orphan count reads as a warning while a
 *  falling one reads as good. */
export function Deltas() {
  return (
    <Grid>
      <KpiTile label="AI Agents" value={412} icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />} delta={12} deltaLabel="this week" />
      <KpiTile label="Orphaned" value={114} icon={<Unlink className="h-4 w-4" />} delta={-9} deltaLabel="this week" deltaInverted />
      <KpiTile label="Privilege drift" value="6.3%" icon={<Activity className="h-4 w-4" />} delta={0.8} deltaLabel="pts" deltaInverted />
      <KpiTile label="Workload identities" value={318} icon={<NhiTypeIcon type="workload-identity" className="h-4 w-4" />} delta={-4} deltaLabel="this week" />
    </Grid>
  );
}

/** `prominent` leads the row with a larger value and a stronger border;
 *  `risk="critical"` is the one place a KPI earns colour, taking the critical
 *  tone on both the chip and the value. The grid track is 240px here so the
 *  sparkline clears the tile's own `@min-[200px]` container query and renders —
 *  see DashboardRow for what happens below that width. */
export function ProminentAndRisk() {
  return (
    <Grid track={240}>
      <KpiTile
        label="AI Agents"
        value={412}
        prominent
        icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />}
        sparkline={[3, 5, 4, 6, 7, 6, 8, 9]}
        delta={12}
        deltaLabel="this week"
      />
      <KpiTile
        label="Critical risk"
        value={38}
        risk="critical"
        icon={<AlertTriangle className="h-4 w-4" />}
        delta={6}
        deltaLabel="this week"
        deltaInverted
      />
    </Grid>
  );
}

/** The dashboard row this component was built for — one prominent tile, one
 *  risk tile, two plain ones, on a shared value baseline. At four columns each
 *  tile falls under 200px, so the AI Agents sparkline suppresses itself: the
 *  gate is a `@container` query on the tile's own width, not the viewport, so
 *  it responds to column count rather than breakpoint. */
export function DashboardRow() {
  return (
    <Grid cols={4}>
      <KpiTile label="AI Agents" value={412} prominent icon={<NhiTypeIcon type="ai-agent" className="h-4 w-4" />} sparkline={[3, 5, 4, 6, 7, 6, 8, 9]} delta={12} deltaLabel="this week" />
      <KpiTile label="Critical risk" value={38} risk="critical" icon={<AlertTriangle className="h-4 w-4" />} delta={6} deltaLabel="this week" deltaInverted />
      <KpiTile label="Orphaned" value={114} icon={<Unlink className="h-4 w-4" />} delta={-9} deltaLabel="this week" deltaInverted />
      <KpiTile label="Total identities" value={2243} icon={<NhiTypeIcon type="service-account" className="h-4 w-4" />} />
    </Grid>
  );
}

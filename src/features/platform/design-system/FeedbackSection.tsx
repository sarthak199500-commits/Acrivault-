import { Banner } from '@/components/ui/Banner';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScanProgress } from '@/components/ui/ScanProgress';
import { Skeleton, SkeletonText, SkeletonTableRows } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ErrorState } from '@/components/ui/ErrorState';
import { NhiTypeIcon } from '@/components/ui/NhiTypeIcon';
import { Button } from '@/components/ui/Button';
import { toast } from '@/stores/toast';
import { NHI_TYPES, NHI_TYPE_LABELS } from '@/mocks/types';
import { DocCard, Section } from './doc-primitives';

export function FeedbackSection() {
  return (
    <Section id="feedback" title="Feedback & states" description="Banners and the four data states every view ships with.">
      <div className="grid gap-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Banners (page-level)"
            description="Persistent messages at the top of a view."
            bodyClassName="flex flex-col gap-3"
            usage="Page-wide context that should stay visible until resolved or dismissed."
            a11y="Critical banners use role=alert; tone is paired with an icon and text, never color alone."
          >
            <Banner tone="info">An informational, page-level message.</Banner>
            <Banner tone="warning">A warning that needs attention but isn't blocking.</Banner>
            <Banner tone="critical">A critical, blocking message.</Banner>
          </DocCard>
          <DocCard
            title="Inline alerts (section-level)"
            description="Quieter than a banner; sits inside forms and sections."
            bodyClassName="flex flex-col gap-3"
            usage="Localized notes attached to a specific section or field."
          >
            <InlineAlert tone="info" title="Heads up.">Quieter than a banner; sits inside forms.</InlineAlert>
            <InlineAlert tone="success" title="Saved.">Your changes were stored.</InlineAlert>
            <InlineAlert tone="warning" title="Baseline learning.">Early signal may be noisy.</InlineAlert>
            <InlineAlert tone="critical" title="Required.">This field can't be empty.</InlineAlert>
          </DocCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Progress"
            description="Determinate and indeterminate progress."
            bodyClassName="flex flex-col gap-4"
            usage="Determinate for known work (rotation); indeterminate when duration is unknown. Tones: accent / success / warning / critical, in md and sm."
            a11y="Renders a progressbar role with value / min / max."
          >
            <ProgressBar value={64} label="Rotation progress" />
            <ProgressBar value={100} tone="success" label="Complete" />
            <ProgressBar value={30} tone="warning" label="Baseline · day 9 of 14" />
            <ProgressBar value={86} tone="critical" label="Near capacity" />
            <ProgressBar value={50} size="sm" label="Compact (sm)" />
            <ProgressBar label="Scanning (indeterminate)" />
          </DocCard>
          <DocCard
            title="Scan progress"
            description="Per-category bars with a running total."
            usage="Live discovery feedback during a scan, broken down by identity type."
          >
            <ScanProgress
              scanning
              rows={NHI_TYPES.map((t, i) => ({
                id: t,
                label: NHI_TYPE_LABELS[t],
                icon: <NhiTypeIcon type={t} className="h-4 w-4" />,
                value: [412, 318, 221, 164, 96][i],
                total: [500, 400, 300, 220, 140][i],
              }))}
            />
          </DocCard>
        </div>
        <DocCard
          title="Skeleton loaders"
          description="Loading placeholders. Compose any shape from Skeleton; SkeletonText and SkeletonTableRows are ready-made."
          usage="Mirror the shape of the content being loaded — a circle for avatars, a tile for KPIs, rows for tables."
          a11y="Every skeleton is aria-hidden, and the shimmer stops under prefers-reduced-motion."
        >
          <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Block · Skeleton</span>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Text · SkeletonText</span>
              <SkeletonText lines={3} />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Avatar · circle + text</span>
              <div className="flex items-center gap-2.5">
                <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                <div className="flex-1"><SkeletonText lines={2} /></div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">KPI tile</span>
              <Skeleton className="h-[var(--size-kpi-tile)] w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Card / panel</span>
              <Skeleton className="h-28 w-full" />
            </div>
            <div className="flex flex-col gap-2">
              <span className="eyebrow">Inline value</span>
              <Skeleton className="h-7 w-16" />
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="eyebrow">Table rows · SkeletonTableRows</span>
            <div className="overflow-hidden rounded-[var(--r-lg)] border border-border">
              <SkeletonTableRows rows={4} cols={5} />
            </div>
          </div>
        </DocCard>

        <div className="grid gap-4 md:grid-cols-3">
          <DocCard
            title="Toasts"
            description="Transient, auto-dismissing confirmations."
            bodyClassName="flex flex-wrap items-center gap-2"
            usage="Brief feedback for a completed action; never for an error that needs a decision. Fire one to see it appear bottom-corner."
            a11y="Rendered in an aria-live region; each toast is keyboard-dismissible."
          >
            <Button size="sm" variant="secondary" onClick={() => toast('Saved', { tone: 'success', description: 'Your changes were stored.' })}>Success</Button>
            <Button size="sm" variant="secondary" onClick={() => toast('Baseline learning', { tone: 'warning' })}>Warning</Button>
            <Button size="sm" variant="secondary" onClick={() => toast('Credential removed', { tone: 'critical' })}>Critical</Button>
            <Button size="sm" variant="secondary" onClick={() => toast('Copied to clipboard')}>Default</Button>
          </DocCard>
          <DocCard
            title="Empty"
            description="No data yet."
            bodyClassName="p-0"
            usage="Explain the absence and offer a clear next step rather than showing a blank panel."
          >
            <EmptyState headline="Nothing here yet" guidance="The empty state explains the absence and offers a next step." />
          </DocCard>
          <DocCard
            title="Error"
            description="Something failed."
            bodyClassName="p-0"
            usage="State what went wrong plainly and offer a retry."
          >
            <ErrorState message="We couldn't load this view." detail="Example technical detail" onRetry={() => {}} />
          </DocCard>
        </div>
      </div>
    </Section>
  );
}

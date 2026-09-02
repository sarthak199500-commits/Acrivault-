import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, ShieldCheck, SkipForward, Sparkles, UserCheck } from 'lucide-react';
import { useCopilotSuggestions } from './queries';
import type { CopilotSuggestion } from '@/mocks/types';
import { screenHeaderProps } from '@/app/nav';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Banner } from '@/components/ui/Banner';
import { Button } from '@/components/ui/Button';
import { QueryBoundary } from '@/components/ui/QueryBoundary';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonText } from '@/components/ui/Skeleton';
import { toast } from '@/stores/toast';
import { SEVERITY_TONE as SEV_TONE } from '@/lib/tones';


function SuggestionCard({ suggestion, rank, onSkip }: { suggestion: CopilotSuggestion; rank: number; onSkip: () => void }) {
  return (
    <Card>
      <CardBody className="flex items-start gap-3 pt-4">
        <span className="tnum mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-[length:var(--fs-small)] font-semibold text-text-secondary">
          {rank}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-text">{suggestion.title}</span>
            <Badge tone={SEV_TONE[suggestion.severity]} className="capitalize">{suggestion.severity}</Badge>
          </div>
          <p className="mt-1 text-[length:var(--fs-small)] text-text-secondary">{suggestion.rationale}</p>
          <Link to={`/discover/${suggestion.identityId}`} className="mt-1 inline-block font-mono text-[length:var(--fs-micro)] text-accent-text hover:underline">
            {suggestion.identityId}
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            leadingIcon={<Play className="h-3.5 w-3.5" />}
            onClick={() => toast('Concept only — nothing was executed', { description: 'A person approves every action.' })}
          >
            Run
          </Button>
          <Button size="sm" variant="ghost" leadingIcon={<SkipForward className="h-3.5 w-3.5" />} onClick={onSkip}>
            Skip
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

export function CopilotScreen() {
  const query = useCopilotSuggestions();
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  return (
    <div>
      <ScreenHeader
        {...screenHeaderProps('/resilience/copilot')}
        description="An advisory assistant that ranks what to look at next. It recommends; it never acts on its own."
        actions={<Badge tone="neutral">Concept</Badge>}
      />

      <Banner tone="info" icon={<UserCheck className="h-4 w-4" />} className="mb-4">
        <span className="font-medium text-text">A person approves every action.</span>{' '}
        The Copilot only suggests — Run is illustrative in this concept and does not execute anything.
      </Banner>

      <QueryBoundary
        query={query}
        loadingFallback={<Card><CardBody className="pt-4"><SkeletonText lines={4} /></CardBody></Card>}
        isEmpty={(d) => d.length === 0}
        empty={<Card><EmptyState icon={<Sparkles className="h-5 w-5" />} headline="No suggestions right now" guidance="The Copilot surfaces ranked suggestions as risk emerges." /></Card>}
      >
        {(suggestions: CopilotSuggestion[]) => {
          const visible = suggestions.filter((s) => !skipped.has(s.id));
          if (visible.length === 0) {
            return (
              <Card>
                <EmptyState icon={<ShieldCheck className="h-5 w-5" />} headline="You've reviewed every suggestion" guidance="Skipped suggestions return as conditions change." />
              </Card>
            );
          }
          return (
            <div className="space-y-3">
              {visible.map((s, i) => (
                <SuggestionCard key={s.id} suggestion={s} rank={i + 1} onSkip={() => setSkipped((prev) => new Set(prev).add(s.id))} />
              ))}
            </div>
          );
        }}
      </QueryBoundary>
    </div>
  );
}

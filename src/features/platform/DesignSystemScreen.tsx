import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { FoundationsSection } from './design-system/FoundationsSection';
import { LayoutSection } from './design-system/LayoutSection';
import { ControlsSection } from './design-system/ControlsSection';
import { StatusSection } from './design-system/StatusSection';
import { NavigationSection } from './design-system/NavigationSection';
import { FeedbackSection } from './design-system/FeedbackSection';
import { VizSection } from './design-system/VizSection';
import { FiltersSection } from './design-system/FiltersSection';
import { AuthSection } from './design-system/AuthSection';

const TOC = [
  { id: 'foundations', label: 'Foundations' },
  { id: 'layout', label: 'Layout & app shell' },
  { id: 'controls', label: 'Controls' },
  { id: 'status', label: 'Status & data' },
  { id: 'navigation', label: 'Navigation & overlays' },
  { id: 'feedback', label: 'Feedback & states' },
  { id: 'viz', label: 'Visualization' },
  { id: 'filters', label: 'Filters & views' },
  { id: 'auth', label: 'Registration & admin' },
];

/* ----------------------------------------------------------------- screen */

export function DesignSystemScreen() {
  return (
    <div>
      <ScreenHeader
        eyebrow="Platform"
        title="Design System"
        description="Every token and component, rendered in the active theme. Toggle theme and density in the top bar to verify both modes."
      />

      {/* Table of contents */}
      <nav aria-label="Design system sections" className="mb-6 flex flex-wrap gap-1.5">
        {TOC.map((t) => (
          <a key={t.id} href={`#${t.id}`} className="rounded-[var(--r-pill)] border border-border bg-surface px-3 py-1 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text">
            {t.label}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {/* ----------------------------------------------------- foundations */}
        <FoundationsSection />

        {/* ----------------------------------------------------- layout & app shell */}
        <LayoutSection />

        {/* ----------------------------------------------------- controls */}
        <ControlsSection />

        {/* ----------------------------------------------------- status & data */}
        <StatusSection />

        {/* ----------------------------------------------------- navigation & overlays */}
        <NavigationSection />

        {/* ----------------------------------------------------- feedback & states */}
        <FeedbackSection />

        {/* ----------------------------------------------------- visualization */}
        <VizSection />

        {/* -------------------------------------------- filters & views */}
        <FiltersSection />

        {/* ---------------------------------------- registration & admin */}
        <AuthSection />
      </div>
    </div>
  );
}

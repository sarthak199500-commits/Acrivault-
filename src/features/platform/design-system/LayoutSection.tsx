import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { RoleSwitcher } from '@/components/ui/RoleSwitcher';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DensityToggle } from '@/components/ui/DensityToggle';
import { RegistrationProgress } from '@/components/ui/RegistrationProgress';
import { DocCard, Section } from './doc-primitives';

export function LayoutSection() {
  return (
    <Section
      id="layout"
      title="Layout & app shell"
      description="The frame: brand mark, the standard screen header, and the persistent top-bar controls."
    >
      <div className="grid gap-4">
        <DocCard
          title="Logo"
          description="Inline SVG that inherits theme color; the mark is painted with the --logo-mark token."
          bodyClassName="flex flex-wrap items-end gap-10"
          usage="Horizontal in the top bar, stacked on auth screens, mark alone where space is tight."
          a11y="Exposed as role=img with an 'Acrivault' label; the tagline is omitted below legible sizes."
        >
          <div className="flex flex-col items-start gap-2">
            <Logo variant="horizontal" />
            <span className="eyebrow">horizontal</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Logo variant="stacked" className="w-28" />
            <span className="eyebrow">stacked</span>
          </div>
          <div className="flex flex-col items-start gap-2">
            <Logo variant="mark" className="h-8" />
            <span className="eyebrow">mark</span>
          </div>
        </DocCard>

        <DocCard
          title="ScreenHeader"
          description="Eyebrow, display title, description, and a right-aligned actions slot."
          usage="The standard top-of-screen header on every route — the header at the very top of this page is a live instance."
          a11y="It owns the screen's single <h1> (id='main-heading', tabIndex=-1) so the route announcer can move focus to it on navigation; only one renders per page."
        >
          {/* Static anatomy replica: the real ScreenHeader renders a singleton
              <h1 id="main-heading">, already used by this page's own header, so we
              don't mount a second one here (a duplicate id / second h1 would break
              the route announcer's focus target). */}
          <div className="rounded-[var(--r-md)] border border-dashed border-border p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-1 eyebrow">Overview</div>
                <div className="text-[length:var(--fs-display)] font-semibold leading-[var(--lh-display)] tracking-tight text-text">
                  Identity Inventory
                </div>
                <p className="mt-1 max-w-2xl text-[length:var(--fs-body)] text-text-secondary">
                  Every non-human identity across your clouds, scored and correlated.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Button variant="secondary" size="sm">Export</Button>
                <Button size="sm">Add source</Button>
              </div>
            </div>
          </div>
        </DocCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Top-bar controls"
            description="Role switcher, theme, and density toggles — live."
            bodyClassName="flex flex-wrap items-center gap-3"
            usage="Persistent controls in the app top bar; interacting here applies globally and persists."
            a11y="Each is labeled; the role switcher is a labeled menu, and the toggles announce the newly-selected state."
          >
            <RoleSwitcher />
            <ThemeToggle />
            <DensityToggle />
          </DocCard>

          <DocCard
            title="RegistrationProgress"
            description="Compact step indicator for the registration flow."
            bodyClassName="flex flex-col gap-4"
            usage="Sits atop the narrow auth card where a fully-labelled stepper would crowd."
            a11y="The 'Step N of M — Label' caption carries progress; the segmented bar is decorative (aria-hidden)."
          >
            <RegistrationProgress current={0} />
            <RegistrationProgress current={2} />
            <RegistrationProgress current={4} />
          </DocCard>
        </div>
      </div>
    </Section>
  );
}

import { useState } from 'react';
import { Check, Copy, Layers, Trash2, TriangleAlert, Wrench } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tabs, TabPanel } from '@/components/ui/Tabs';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { Dialog } from '@/components/ui/Dialog';
import { Drawer } from '@/components/ui/Drawer';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/Popover';
import { Breadcrumb } from '@/components/ui/Breadcrumb';
import { Pagination } from '@/components/ui/Pagination';
import { Accordion } from '@/components/ui/Accordion';
import { Stepper } from '@/components/ui/Stepper';
import { Timeline } from '@/components/ui/Timeline';
import { PhaseTrack } from '@/features/rotate/PhaseTrack';
import { toast } from '@/stores/toast';
import { DocCard, Section } from './doc-primitives';

export function NavigationSection() {
  const [tab, setTab] = useState('one');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [page, setPage] = useState(3);

  return (
    <>
      <Section id="navigation" title="Navigation & overlays" description="Tabs, menus, tooltips, dialogs, and timelines.">
        <div className="grid gap-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <DocCard
              title="Tabs"
              description="Switch between panels of related content."
              bodyClassName="block"
              usage="In-page sectioning of a single record or screen; keep labels short."
              a11y="Arrow-key navigation; the active tab carries aria-selected and a focus ring."
            >
              <Tabs value={tab} onValueChange={setTab} tabs={[{ value: 'one', label: 'Overview' }, { value: 'two', label: 'Sources' }, { value: 'three', label: 'Activity' }]}>
                <TabPanel value="one" className="text-[length:var(--fs-small)] text-text-secondary">Overview panel content.</TabPanel>
                <TabPanel value="two" className="text-[length:var(--fs-small)] text-text-secondary">Sources panel content.</TabPanel>
                <TabPanel value="three" className="text-[length:var(--fs-small)] text-text-secondary">Activity panel content.</TabPanel>
              </Tabs>
            </DocCard>

            <DocCard
              title="Tooltip, menu & overlays"
              description="Anchored, dismissible surfaces."
              bodyClassName="flex flex-col gap-4"
              usage="Tooltip for hover/focus hints, dropdown for row actions, popover for rich content, dialog & drawer for focused tasks, toast for confirmations, and ⌘K for the command palette."
              a11y="All manage or trap focus and close on Escape; menu items are arrow-navigable."
            >
              <div className="flex flex-wrap items-center gap-3">
                <Tooltip content="A themed tooltip"><Button variant="secondary" size="sm">Hover me</Button></Tooltip>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="secondary" size="sm">Menu</Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem selected onSelect={() => toast('Edit selected')}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => toast('Duplicated')}>Duplicate</DropdownMenuItem>
                    <DropdownMenuItem disabled>Move</DropdownMenuItem>
                    <DropdownMenuItem disabled title="Assign another Tenant Admin first.">Suspend</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => toast('Removed', { tone: 'critical' })}>
                      <span className="inline-flex items-center gap-2 text-crit-fg"><Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Remove</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Popover>
                  <PopoverTrigger asChild><Button variant="secondary" size="sm">Popover</Button></PopoverTrigger>
                  <PopoverContent ariaLabel="Example popover" className="max-w-xs text-[length:var(--fs-small)] text-text-secondary">
                    A generic popover surface for rich, anchored content.
                  </PopoverContent>
                </Popover>
                <Button size="sm" onClick={() => setDialogOpen(true)}>Open dialog</Button>
                <Button size="sm" variant="secondary" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
                <Button size="sm" variant="ghost" onClick={() => toast('Saved', { tone: 'success', description: 'A toast notification.' })}>Fire toast</Button>
                <Button size="sm" variant="ghost" onClick={() => window.dispatchEvent(new CustomEvent('acv:open-command-palette'))}>
                  Command palette (⌘K)
                </Button>
              </div>
              <div className="flex flex-col items-start gap-2">
                <span className="eyebrow">Menu · item states</span>
                {/* Static replica of the open menu (the live one is portaled). */}
                <div className="w-52 rounded-[var(--r-md)] border border-border-strong bg-surface-2 p-1 shadow-[var(--shadow-md)]">
                  <div className="px-2.5 pb-1 pt-1.5 eyebrow">Actions</div>
                  <div className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)] text-text-secondary">
                    Edit · selected
                    <Check className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  </div>
                  <div className="rounded-[var(--r-sm)] bg-surface-hover px-2.5 py-1.5 text-[length:var(--fs-small)] text-text">Duplicate · highlighted</div>
                  <div className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)] text-text-secondary opacity-40">Move · disabled</div>
                  <div className="my-1 h-px bg-border" />
                  <div className="inline-flex items-center gap-2 rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)] text-crit-fg">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Delete · destructive
                  </div>
                </div>
              </div>
            </DocCard>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <DocCard
              title="Breadcrumb"
              description="Shows location within the hierarchy."
              bodyClassName="block"
              usage="On detail screens to trace the path back to the list."
              a11y="A nav landmark wrapping an ordered list; the last item is the current page."
            >
              <Breadcrumb items={[{ label: 'Discover', to: '/discover' }, { label: 'Identity', to: '/discover' }, { label: 'agent-orchestrator-00412' }]} />
            </DocCard>
            <DocCard
              title="Pagination"
              description="Page through long result sets."
              bodyClassName="flex flex-col gap-3"
              usage="For server-style paging where infinite scroll isn't appropriate; Prev/Next disable at the ends."
              a11y="The current page uses aria-current; every control is labeled."
            >
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">Interactive</span>
                <Pagination page={page} pageCount={20} onPageChange={setPage} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">First page · Prev disabled</span>
                <Pagination page={1} pageCount={20} onPageChange={() => undefined} />
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="eyebrow">Last page · Next disabled</span>
                <Pagination page={20} pageCount={20} onPageChange={() => undefined} />
              </div>
            </DocCard>
          </div>

          <DocCard
            title="Accordion"
            description="Progressive disclosure for grouped content."
            bodyClassName="block"
            usage="FAQs and dense, optional settings; collapse what isn't needed by default."
            a11y="Headers are buttons with aria-expanded; panels are keyboard-reachable."
          >
            <Accordion
              defaultValue="a"
              items={[
                { value: 'a', title: 'What is a non-human identity?', content: 'Service accounts, API keys, OAuth tokens, workload identities, and AI agents.' },
                { value: 'b', title: 'What is an orphaned identity?', content: 'A credential with no clear owner or no recent legitimate use — first-class, high-risk.' },
                { value: 'c', title: 'What is blast radius?', content: 'What an identity could reach by direct, transitive, and cascade paths.' },
              ]}
            />
          </DocCard>

          <DocCard
            title="Stepper"
            description="Progress through a short linear flow."
            bodyClassName="block"
            usage="Onboarding and wizards (Connect → Scan → Review)."
            a11y="The current step is marked with aria-current."
          >
            <Stepper steps={[{ id: 'a', label: 'Connect' }, { id: 'b', label: 'Scan' }, { id: 'c', label: 'Review' }]} current={1} />
          </DocCard>

          <DocCard
            title="Rotation phase track"
            description="The six-phase zero-downtime lifecycle."
            status="experimental"
            bodyClassName="pt-6"
            usage="Visualizes a credential rotation on the Rotate screen."
            a11y="The current phase uses aria-current with an sr-only state word."
          >
            <PhaseTrack phase="propagate" phaseProgress={0.5} />
          </DocCard>

          <DocCard
            title="Timeline"
            description="Used for agent sessions and rotation phases; supports an anomaly style."
            bodyClassName="block"
            usage="Ordered sequence of events; the anomaly tone flags a suspicious step."
            a11y="An ordered list; the selected item is marked for assistive tech."
          >
            <Timeline
              ariaLabel="Example timeline"
              items={[
                { id: '1', icon: <Wrench className="h-3.5 w-3.5" />, title: 'Tool call', meta: '#1', tone: 'done' },
                { id: '2', icon: <TriangleAlert className="h-3.5 w-3.5" />, title: 'Anomalous tool call', meta: '#2', tone: 'anomaly' },
                { id: '3', icon: <Layers className="h-3.5 w-3.5" />, title: 'Model response', meta: '#3', tone: 'active', selected: true },
              ]}
            />
          </DocCard>
        </div>
      </Section>

      {/* Overlay demos */}
      <Dialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Example dialog"
        description="A centered modal with focus trap and Escape-to-close."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
          </>
        }
      >
        <p className="text-[length:var(--fs-small)] text-text-secondary">Dialog body content goes here.</p>
      </Dialog>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen} title="Example drawer" description="A right-side panel for detail views.">
        <p className="text-[length:var(--fs-small)] text-text-secondary">
          Used for Identity Detail, Alert detail, and the Session Replay side rail.
        </p>
        <div className="mt-4 flex items-center gap-2 text-[length:var(--fs-small)] text-text-tertiary">
          <Copy className="h-4 w-4" aria-hidden="true" /> Focus is trapped and returned on close.
        </div>
      </Drawer>
    </>
  );
}

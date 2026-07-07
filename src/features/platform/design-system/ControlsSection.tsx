import { useState } from 'react';
import { Check, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui/Button';
import { IconButton } from '@/components/ui/IconButton';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Select } from '@/components/ui/Select';
import { Combobox } from '@/components/ui/Combobox';
import { Checkbox } from '@/components/ui/Checkbox';
import { RadioGroup } from '@/components/ui/RadioGroup';
import { Switch } from '@/components/ui/Switch';
import { Slider } from '@/components/ui/Slider';
import { NHI_TYPES, NHI_TYPE_LABELS, CLOUDS, CLOUD_LABELS } from '@/mocks/types';
import { ButtonStates, DocCard, FOCUS_RING, Section, StateMatrix } from './doc-primitives';

export function ControlsSection() {
  const [checked, setChecked] = useState(true);
  const [switched, setSwitched] = useState(true);
  const [sel, setSel] = useState('ai-agent');
  const [radio, setRadio] = useState('standard');
  const [slider, setSlider] = useState(60);
  const [combo, setCombo] = useState('aws');

  return (
    <Section
      id="controls"
      title="Controls"
      description="Buttons and form inputs. Each control documents its interaction states and a usage / accessibility note. Hover, focus, and active are shown statically using the real state tokens."
    >
      <div className="grid gap-4">
        <DocCard
          title="Button"
          description="The primary action control — every state, across all four variants."
          usage={
            <>
              One primary action per view; <span className="font-mono">secondary</span> and{' '}
              <span className="font-mono">ghost</span> for lower emphasis;{' '}
              <span className="font-mono">danger</span> for destructive confirmation.
            </>
          }
          a11y="Keyboard-operable with a visible focus ring; loading sets aria-busy and disables the button."
        >
          <ButtonStates variant="primary" label="Primary" />
          <ButtonStates variant="secondary" label="Secondary" />
          <ButtonStates variant="ghost" label="Ghost" />
          <ButtonStates variant="danger" label="Danger" />
          <div>
            <span className="mb-2 block text-[length:var(--fs-small)] font-medium text-text-secondary">Sizes &amp; icons</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button leadingIcon={<Plus className="h-4 w-4" />}>Leading icon</Button>
              <Button variant="secondary" trailingIcon={<Trash2 className="h-4 w-4" />}>Trailing icon</Button>
              <IconButton label="Icon only"><Plus className="h-4 w-4" /></IconButton>
              <a href="#controls" className={buttonClasses('secondary', 'sm')}>Link as button</a>
            </div>
            <span className="mt-2 block text-[length:var(--fs-micro)] text-text-tertiary">
              Only <span className="font-mono">sm</span> and <span className="font-mono">md</span> exist today — xs / lg / xl are not yet defined.
            </span>
          </div>
        </DocCard>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Icon button"
            description="Icon-only action for dense toolbars."
            usage="Use where space is tight and the icon is unambiguous; always pass a label."
            a11y="The label becomes both aria-label and a title tooltip."
          >
            <StateMatrix
              cells={[
                { label: 'Default', node: <IconButton label="Settings"><Settings2 className="h-4 w-4" /></IconButton> },
                { label: 'Hover', node: <IconButton label="Settings" className="!bg-surface-hover !text-text"><Settings2 className="h-4 w-4" /></IconButton> },
                { label: 'Focus', node: <IconButton label="Settings" className={FOCUS_RING}><Settings2 className="h-4 w-4" /></IconButton> },
                { label: 'Secondary', node: <IconButton label="Delete" variant="secondary"><Trash2 className="h-4 w-4" /></IconButton> },
                { label: 'Disabled', node: <IconButton label="Add" disabled><Plus className="h-4 w-4" /></IconButton> },
              ]}
            />
          </DocCard>

          <DocCard
            title="Input"
            description="Single-line text entry."
            usage="Pair with a label and an optional hint or error; use the prefix slot for a leading icon."
            a11y="Label is associated to the field; errors use role=alert and set aria-invalid. Focus shows an accent border + ring (focus-within)."
          >
            <StateMatrix
              cells={[
                { label: 'Default', node: <div className="w-48"><Input hideLabel label="Default" placeholder="Type here…" /></div> },
                { label: 'Filled', node: <div className="w-48"><Input hideLabel label="Filled" defaultValue="agent-orchestrator" /></div> },
                { label: 'With prefix', node: <div className="w-48"><Input hideLabel label="Search" prefix={<Search className="h-4 w-4" />} placeholder="Search…" /></div> },
                { label: 'Invalid', node: <div className="w-48"><Input hideLabel label="Invalid" error="This field is required." /></div> },
                { label: 'Disabled', node: <div className="w-48 opacity-60"><Input hideLabel label="Disabled" defaultValue="Locked" disabled /></div>, note: 'First-class disabled / read-only styling is a planned addition.' },
              ]}
            />
          </DocCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Checkbox"
            description="Binary or tri-state selection."
            usage="Use in forms and table headers; the indeterminate state marks a partial selection."
            a11y="Radix-backed; pass aria-label when there is no visible label."
          >
            <StateMatrix
              cells={[
                { label: 'Unchecked', node: <Checkbox checked={false} aria-label="Unchecked" /> },
                { label: 'Checked', node: <Checkbox checked aria-label="Checked" /> },
                { label: 'Indeterminate', node: <Checkbox checked="indeterminate" aria-label="Indeterminate" /> },
                { label: 'Focus', node: <Checkbox checked aria-label="Focused" className={FOCUS_RING} /> },
                { label: 'Disabled', node: <Checkbox checked={false} disabled aria-label="Disabled" /> },
                { label: 'Interactive', node: <Checkbox checked={checked} onCheckedChange={setChecked} aria-label="Interactive checkbox" /> },
              ]}
            />
          </DocCard>

          <DocCard
            title="Switch"
            description="Immediate on/off setting."
            usage="Use for settings that apply instantly with no explicit save; prefer a Checkbox inside forms."
            a11y="Pass ariaLabel; keyboard focus shows an accent ring."
          >
            <StateMatrix
              cells={[
                { label: 'Off', node: <Switch checked={false} onCheckedChange={() => undefined} ariaLabel="Off" /> },
                { label: 'On', node: <Switch checked onCheckedChange={() => undefined} ariaLabel="On" /> },
                { label: 'Disabled off', node: <Switch checked={false} onCheckedChange={() => undefined} disabled ariaLabel="Disabled off" /> },
                { label: 'Disabled on', node: <Switch checked onCheckedChange={() => undefined} disabled ariaLabel="Disabled on" /> },
                { label: 'Interactive', node: <Switch checked={switched} onCheckedChange={setSwitched} ariaLabel="Interactive switch" /> },
              ]}
            />
          </DocCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <DocCard
            title="Select & Combobox"
            description="Choose from a set of options — closed and open."
            usage={
              <>
                Use <span className="font-mono">Select</span> for short option sets and{' '}
                <span className="font-mono">Combobox</span> when filtering helps (clouds, owners).
              </>
            }
            a11y="Radix listbox semantics with full keyboard navigation and typeahead; the open panel takes arrow-key focus."
          >
            <div className="flex flex-wrap items-start gap-x-10 gap-y-5">
              <div className="flex flex-col items-start gap-3">
                <span className="eyebrow">Closed</span>
                <Select
                  value={sel}
                  onValueChange={setSel}
                  ariaLabel="Demo select"
                  options={NHI_TYPES.map((t) => ({ value: t, label: NHI_TYPE_LABELS[t] }))}
                />
                <div className="flex items-center gap-2">
                  <Select
                    value={sel}
                    onValueChange={setSel}
                    size="sm"
                    ariaLabel="Small select"
                    options={NHI_TYPES.map((t) => ({ value: t, label: NHI_TYPE_LABELS[t] }))}
                  />
                  <span className="text-[length:var(--fs-micro)] text-text-tertiary">sm</span>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={sel}
                    onValueChange={setSel}
                    disabled
                    ariaLabel="Disabled select"
                    options={NHI_TYPES.map((t) => ({ value: t, label: NHI_TYPE_LABELS[t] }))}
                  />
                  <span className="text-[length:var(--fs-micro)] text-text-tertiary">disabled</span>
                </div>
                <Combobox
                  value={combo}
                  onChange={setCombo}
                  ariaLabel="Cloud combobox"
                  options={CLOUDS.map((c) => ({ value: c, label: CLOUD_LABELS[c] }))}
                  placeholder="Pick a cloud…"
                  className="w-56"
                />
              </div>
              <div className="flex flex-col items-start gap-2">
                <span className="eyebrow">Open · Select</span>
                {/* Static replica of the open Select menu (the live panel is portaled). */}
                <div className="w-48 overflow-hidden rounded-[var(--r-md)] border border-border-strong bg-surface-2 p-1 shadow-[var(--shadow-md)]">
                  <div className="flex items-center justify-between gap-3 rounded-[var(--r-sm)] bg-surface-hover px-2.5 py-1.5 text-[length:var(--fs-small)] text-text">
                    AI Agent
                    <Check className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                  </div>
                  {['Service Account', 'API Key', 'OAuth Token'].map((l) => (
                    <div key={l} className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)] text-text-secondary">{l}</div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <span className="eyebrow">Open · Combobox</span>
                <div className="w-56 overflow-hidden rounded-[var(--r-md)] border border-border-strong bg-surface-2 shadow-[var(--shadow-md)]">
                  <div className="flex items-center gap-2 border-b border-border px-2.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                    <span className="flex h-9 items-center text-[length:var(--fs-small)] text-text-tertiary">Filter…</span>
                  </div>
                  <div className="p-1">
                    <div className="flex items-center justify-between gap-2 rounded-[var(--r-sm)] bg-surface-hover px-2.5 py-1.5 text-[length:var(--fs-small)] text-text">
                      AWS
                      <Check className="h-3.5 w-3.5 text-accent-text" aria-hidden="true" />
                    </div>
                    {['Google Cloud', 'Azure'].map((l) => (
                      <div key={l} className="rounded-[var(--r-sm)] px-2.5 py-1.5 text-[length:var(--fs-small)] text-text-secondary">{l}</div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-start gap-2">
                <span className="eyebrow">Combobox · no matches</span>
                <div className="w-56 overflow-hidden rounded-[var(--r-md)] border border-border-strong bg-surface-2 shadow-[var(--shadow-md)]">
                  <div className="flex items-center gap-2 border-b border-border px-2.5">
                    <Search className="h-3.5 w-3.5 shrink-0 text-text-tertiary" aria-hidden="true" />
                    <span className="flex h-9 items-center text-[length:var(--fs-small)] text-text">xyz</span>
                  </div>
                  <div className="px-2.5 py-2 text-[length:var(--fs-small)] text-text-tertiary">No matches.</div>
                </div>
              </div>
            </div>
          </DocCard>

          <DocCard
            title="Textarea"
            description="Multi-line text entry."
            usage="Use for notes and free-form context; supports a live character count."
          >
            <Textarea label="Notes" hint="Up to 200 characters." maxLength={200} showCount placeholder="Add context…" />
          </DocCard>
        </div>

        <DocCard
          title="Radio group & Slider"
          description="Single choice from a list, and a bounded numeric value."
          bodyClassName="grid gap-5 lg:grid-cols-2"
          usage="Radio for one-of-many with descriptions; Slider for thresholds within a range."
          a11y="The Slider thumb carries an aria-label; both are fully keyboard-operable."
        >
          <RadioGroup
            value={radio}
            onValueChange={setRadio}
            ariaLabel="Rotation mode"
            options={[
              { value: 'standard', label: 'Standard rotation', description: 'Zero-downtime, scheduled.' },
              { value: 'emergency', label: 'Emergency rotation', description: 'Immediate revocation.' },
              { value: 'scheduled', label: 'Scheduled rotation', description: 'Unavailable on this plan.', disabled: true },
            ]}
          />
          <div className="flex flex-col gap-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-[length:var(--fs-small)] text-text-secondary">
                <span>Risk threshold</span>
                <span className="tnum text-text">{slider}</span>
              </div>
              <Slider value={slider} onValueChange={setSlider} ariaLabel="Risk threshold" />
            </div>
            <div>
              <div className="mb-1 text-[length:var(--fs-small)] text-text-tertiary">Disabled</div>
              <Slider value={40} onValueChange={() => undefined} ariaLabel="Disabled threshold (preview)" disabled />
            </div>
          </div>
        </DocCard>
      </div>
    </Section>
  );
}

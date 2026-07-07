import { Shield } from 'lucide-react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ScrollableTable } from '@/components/ui/ScrollableTable';
import { Badge } from '@/components/ui/Badge';
import { RiskPill } from '@/components/ui/RiskPill';
import { Ramp, Section, Spec, Swatch, TokenRow } from './doc-primitives';
import {
  BLUR, BORDER_WIDTHS, BREAKPOINTS, CATEGORICAL, FONT_FAMILIES, ICON_GALLERY, ICON_SIZES, LAYOUT_TOKENS,
  MOTION, OPACITY, PRODUCT_TYPE, RADII, RAMPS, SHADOWS, SIZES, SPACING, STATUS_HUES, TRACKING, TYPE_STEPS, WEIGHTS, ZINDEX,
} from './foundations-data';

export function FoundationsSection() {
  return (
    <Section id="foundations" title="Foundations" description="The near-monochrome resting palette. Color is reserved for risk and anomaly.">
      <div className="grid grid-cols-1 gap-4">
        <Spec label="Surfaces & text">
          <Swatch name="--bg" varName="--bg" />
          <Swatch name="--surface" varName="--surface" />
          <Swatch name="--surface-2" varName="--surface-2" />
          <Swatch name="--surface-hover" varName="--surface-hover" />
          <Swatch name="--border" varName="--border" />
          <Swatch name="--border-strong" varName="--border-strong" />
          <Swatch name="--accent" varName="--accent" />
          <Swatch name="--accent-tint" varName="--accent-tint" />
        </Spec>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Spec label="Risk scale" className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <Swatch name="critical" varName="--risk-critical" />
              <Swatch name="high" varName="--risk-high" />
              <Swatch name="medium" varName="--risk-medium" />
              <Swatch name="low" varName="--risk-low" />
              <Swatch name="minimal" varName="--risk-minimal" />
            </div>
            <div className="flex flex-wrap gap-2">
              <RiskPill score={92} />
              <RiskPill score={68} />
              <RiskPill score={47} />
              <RiskPill score={24} />
              <RiskPill score={8} />
            </div>
            <p className="text-[length:var(--fs-micro)] leading-[var(--lh-micro)] text-text-tertiary">
              Score → band: critical 80–100 · high 60–79 · medium 40–59 · low 20–39 · minimal 0–19.
            </p>
          </Spec>

          <Spec label="Semantic badges">
            <Badge tone="neutral">Neutral</Badge>
            <Badge tone="success" icon={<Shield className="h-3 w-3" />}>Governed</Badge>
            <Badge tone="warning">Drift</Badge>
            <Badge tone="critical">Orphaned</Badge>
            <Badge tone="info">Synthetic</Badge>
          </Spec>
        </div>

        <Spec label="Status hues (base)" className="flex flex-wrap items-center gap-x-6 gap-y-2">
          {STATUS_HUES.map((h) => <Swatch key={h} name={`--${h}`} varName={`--${h}`} />)}
        </Spec>

        <Card>
          <CardHeader
            title="Type scale"
            description="The full scale-named primitive set (reference parity), each in four weights. Inter for UI, JetBrains Mono for code. The product uses the lower band, but every step is tokenized."
          />
          <CardBody className="space-y-4">
            <ScrollableTable label="Type scale specimens">
              <div className="min-w-[600px] space-y-3">
                <div className="grid grid-cols-[120px_repeat(4,1fr)] items-center gap-x-4 border-b border-border pb-1.5">
                  <span className="eyebrow">Style</span>
                  {WEIGHTS.map(([label]) => (
                    <span key={label} className="eyebrow">{label}</span>
                  ))}
                </div>
                {TYPE_STEPS.map((s) => (
                  <div key={s.name} className="grid grid-cols-[120px_repeat(4,1fr)] items-baseline gap-x-4">
                    <div className="flex flex-col">
                      <span className="text-[length:var(--fs-small)] text-text">{s.name}</span>
                      <span className="font-mono text-[10px] text-text-tertiary">{s.spec}</span>
                    </div>
                    {WEIGHTS.map(([label, w]) => (
                      <span
                        key={label}
                        className="truncate text-text"
                        style={{
                          fontSize: `var(${s.fs})`,
                          lineHeight: `var(${s.lh})`,
                          letterSpacing: s.tracking ? `var(${s.tracking})` : undefined,
                          fontWeight: w,
                        }}
                      >
                        Ag
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </ScrollableTable>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2 border-t border-border pt-3">
              <span className="text-[length:var(--fs-display)] leading-[var(--lh-display)] text-text">
                Securing every identity that has no face
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">Eyebrow</span>
                <span className="eyebrow">Non-human identities</span>
              </span>
              <span className="flex items-baseline gap-3">
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">Mono / tnum</span>
                <span className="tnum font-mono">1,204 · idn_0a3f · 51,204</span>
              </span>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 border-t border-border pt-3 lg:grid-cols-2">
              <div>
                <span className="eyebrow mb-2 block">Product type tokens · the console subset</span>
                <div className="space-y-1.5">
                  {PRODUCT_TYPE.map((s) => (
                    <TokenRow key={s.name} token={s.fs} value={s.spec}>
                      <span
                        className={s.mono ? 'truncate font-mono text-text' : 'truncate text-text'}
                        style={{ fontSize: `var(${s.fs})`, lineHeight: s.lh ? `var(${s.lh})` : undefined }}
                      >
                        {s.name}
                      </span>
                    </TokenRow>
                  ))}
                </div>
              </div>
              <div>
                <span className="eyebrow mb-2 block">Font families</span>
                <div className="space-y-1.5">
                  {FONT_FAMILIES.map(([token, label]) => (
                    <TokenRow key={token} token={token} value={label}>
                      <span className="text-text" style={{ fontFamily: `var(${token})` }}>Ag 0123</span>
                    </TokenRow>
                  ))}
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Color ramps" description="The primitive palette. Semantic tokens (surfaces, text, status) build on these." />
          <CardBody className="space-y-3">
            {RAMPS.map((r) => <Ramp key={r.name} name={r.name} label={r.label} />)}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Categorical palette" description="For multi-series data-viz. Calm and colorblind-aware; red stays reserved for risk." />
          <CardBody className="flex flex-wrap gap-x-6 gap-y-2">
            {CATEGORICAL.map((n) => <Swatch key={n} name={`--${n}`} varName={`--${n}`} />)}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Semantic tokens" description="The usage layer — these flip per theme. Status tones ship as a bg / fg pair." />
          <CardBody className="grid grid-cols-2 gap-x-6 gap-y-1.5 sm:grid-cols-3">
            {[
              '--bg', '--surface', '--surface-2', '--surface-hover', '--border', '--border-strong',
              '--text-primary', '--text-secondary', '--text-tertiary',
              '--accent', '--accent-hover', '--accent-press', '--accent-text', '--accent-tint',
              '--ok-bg', '--ok-fg', '--warn-bg', '--warn-fg', '--crit-bg', '--crit-fg',
              '--info-bg', '--info-fg', '--neutral-bg', '--neutral-fg', '--grid-line', '--scrim',
              '--logo-mark',
              '--nav-bg', '--nav-border', '--nav-text', '--nav-text-strong', '--nav-eyebrow',
              '--nav-hover-bg', '--nav-active-bg', '--nav-active-text', '--nav-logo-mark',
              '--chip-default-bg', '--chip-default-fg', '--chip-prominent-bg', '--chip-prominent-fg',
              '--chip-risk-bg', '--chip-risk-fg', '--surface-hover-brand',
            ].map((v) => <Swatch key={v} name={v} varName={v} />)}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Spec label="Radius">
            {RADII.map((r) => (
              <div key={r.name} className="flex flex-col items-center gap-1">
                <span className="h-12 w-12 border border-border-strong bg-surface-2" style={{ borderRadius: `var(${r.varName})` }} aria-hidden="true" />
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">{r.name}</span>
              </div>
            ))}
          </Spec>
          <Spec label="Border widths">
            {BORDER_WIDTHS.map(([n, px]) => (
              <div key={n} className="flex flex-col items-center gap-1">
                <span className="h-12 w-12 rounded-[var(--r-sm)] bg-surface-2" style={{ border: `${px}px solid var(--border-strong)` }} aria-hidden="true" />
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">--{n} · {px}px</span>
              </div>
            ))}
          </Spec>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Spacing scale" description="4px base grid." />
            <CardBody className="space-y-1.5">
              {SPACING.map(([n, px]) => (
                <TokenRow key={n} token={`--${n}`} value={`${px}px`}>
                  <span className="h-3 rounded-sm bg-accent-tint" style={{ width: `var(--${n})` }} aria-hidden="true" />
                </TokenRow>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Sizing" description="Icons, controls, avatars." />
            <CardBody className="space-y-2">
              {SIZES.map(([n, px]) => (
                <TokenRow key={n} token={`--size-${n}`} value={`${px}px`}>
                  <span className="rounded-[var(--r-xs)] border border-border bg-surface-2" style={{ width: px, height: px }} aria-hidden="true" />
                </TokenRow>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Layout" description="Frame dimensions for the app shell." />
            <CardBody className="space-y-1">
              {LAYOUT_TOKENS.map(([n, v]) => <TokenRow key={n} token={n} value={v} />)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Density & focus" description="Row rhythm (data-density) and the focus ring." />
            <CardBody className="space-y-2">
              <TokenRow token="--row-py" value="12 / 8 / 14px" />
              <TokenRow token="--cell-px" value="16 / 12 / 16px" />
              <TokenRow token="--focus-w" value="2px" />
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  className="h-8 rounded-[var(--r-sm)] border border-border-strong bg-surface-2 px-3 text-[length:var(--fs-small)] text-text-secondary outline outline-2 outline-offset-2 outline-[var(--accent)]"
                >
                  Focus ring
                </button>
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">:focus-visible</span>
              </div>
            </CardBody>
          </Card>
        </div>

        <Card>
          <CardHeader title="Iconography" description="Lucide, 1.5px stroke. Three size tokens; icons inherit the current text color. Every glyph the app imports." />
          <CardBody className="space-y-4">
            <div className="flex items-end gap-5">
              {ICON_SIZES.map(([n, px]) => (
                <div key={n} className="flex flex-col items-center gap-1">
                  <Shield size={px} className="text-text-secondary" aria-hidden="true" />
                  <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">--size-{n}</span>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6 xl:grid-cols-10">
              {ICON_GALLERY.map(({ name, Icon }) => (
                <div
                  key={name}
                  className="flex flex-col items-center gap-1.5 rounded-[var(--r-sm)] border border-border bg-surface-2 px-1.5 py-2"
                >
                  <Icon className="h-4 w-4 text-text-secondary" aria-hidden="true" />
                  <span className="w-full truncate text-center text-[length:var(--fs-micro)] text-text-tertiary" title={name}>
                    {name}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Elevation" description="Shadow tokens, tuned per theme." />
          <CardBody className="flex flex-wrap gap-5">
            {SHADOWS.map((s) => (
              <div key={s} className="flex flex-col items-center gap-2">
                <span className="h-16 w-16 rounded-[var(--r-md)] bg-surface" style={{ boxShadow: `var(--shadow-${s})` }} aria-hidden="true" />
                <span className="font-mono text-[length:var(--fs-micro)] text-text-tertiary">shadow-{s}</span>
              </div>
            ))}
          </CardBody>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Font weights" />
            <CardBody className="space-y-1.5">
              {WEIGHTS.map(([n, w]) => (
                <TokenRow key={n} token={`--fw-${n}`} value={String(w)}>
                  <span className="text-[length:var(--fs-body)] text-text" style={{ fontWeight: w }}>Securing every identity</span>
                </TokenRow>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Letter spacing" />
            <CardBody className="space-y-1.5">
              {TRACKING.map(([n, v]) => (
                <TokenRow key={n} token={`--tracking-${n}`} value={v}>
                  <span className={n === 'eyebrow' ? 'uppercase' : ''} style={{ letterSpacing: v, fontSize: 'var(--fs-small)', color: 'var(--text)' }}>
                    Non-human identities
                  </span>
                </TokenRow>
              ))}
            </CardBody>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader title="Motion" description="Durations & easing." />
            <CardBody className="space-y-1.5">
              {MOTION.map(([n, v]) => <TokenRow key={n} token={`--${n}`} value={v} />)}
              <TokenRow token="--ease-standard" value="cubic-bezier(.2,0,0,1)" />
              <TokenRow token="--ease-emphasized" value="cubic-bezier(.05,.7,.1,1)" />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Z-index scale" />
            <CardBody className="space-y-1">
              {ZINDEX.map(([n, z]) => <TokenRow key={n} token={`--z-${n}`} value={String(z)} />)}
            </CardBody>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader title="Opacity" />
            <CardBody className="space-y-2">
              {OPACITY.map(([n, o]) => (
                <TokenRow key={n} token={`--opacity-${n}`} value={String(o)}>
                  <span className="h-4 w-10 rounded-sm bg-accent" style={{ opacity: o }} aria-hidden="true" />
                </TokenRow>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Blur" />
            <CardBody className="space-y-2">
              {BLUR.map(([n, v]) => (
                <TokenRow key={n} token={`--blur-${n}`} value={v}>
                  <span className="relative h-6 w-10 overflow-hidden rounded-sm">
                    <span className="absolute inset-0 bg-gradient-to-r from-accent to-[var(--info)]" style={{ filter: `blur(${v})` }} aria-hidden="true" />
                  </span>
                </TokenRow>
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Breakpoints" />
            <CardBody className="space-y-1">
              {BREAKPOINTS.map(([n, px]) => <TokenRow key={n} token={n} value={`${px}px`} />)}
            </CardBody>
          </Card>
        </div>
      </div>
    </Section>
  );
}

import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';
import type { Cloud } from '@/mocks/types';
import type { ConnectionState } from '@/lib/tones';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { KeyValueList } from '@/components/ui/KeyValueList';
import { Accordion } from '@/components/ui/Accordion';
import { Banner } from '@/components/ui/Banner';
import { InlineAlert } from '@/components/ui/InlineAlert';
import { announce } from '@/lib/a11y';
import { count } from '@/lib/format';
import { cn } from '@/lib/cn';
import {
  CONNECTORS,
  initialValues,
  scriptLines,
  validateFields,
  type FieldValues,
} from './connectors';

/**
 * The four states a cloud connection moves through, in one dialog.
 *
 * `confirm` is deliberately a state of this dialog rather than a second, stacked
 * modal: it keeps what you are disconnecting on screen while you decide, and avoids
 * a popover-on-popover. Disconnect is destructive, so it never sits in the same
 * button cluster as Close — see the split footers below.
 */
export interface CloudConnectionDialogProps {
  cloud: Cloud;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `connect` opens the form; `manage` opens the details of a live connection. */
  mode: 'connect' | 'manage';
  /**
   * The parent owns connection state and the handoff timer, so a handoff started
   * here survives this dialog being closed — which is what "closing this is safe"
   * promises. The dialog reads status to move itself from handoff to details.
   */
  status: ConnectionState;
  /** Values captured when the connection was made. Required in `manage`. */
  values?: FieldValues;
  /**
   * Identities with at least one source in this cloud, or undefined before the
   * first scan. Correlated identities count in every cloud they appear in, so this
   * is "seen here" rather than a share of the tenant total.
   */
  identitiesFound?: number;
  /** Starts the handoff. The parent flips the card to `connecting`. */
  onSubmit: (values: FieldValues) => void;
  /** Abandons an in-flight handoff. */
  onCancel: () => void;
  /** Returns false when the customer's console has not reported back yet. */
  onCheckNow: () => boolean;
  onDisconnect: () => void;
}

export function CloudConnectionDialog({
  cloud,
  open,
  onOpenChange,
  mode,
  status,
  values: committed,
  identitiesFound,
  onSubmit,
  onCancel,
  onCheckNow,
  onDisconnect,
}: CloudConnectionDialogProps) {
  const spec = CONNECTORS[cloud];
  const [submitted, setSubmitted] = useState(mode === 'connect' && status === 'connecting');
  const [confirming, setConfirming] = useState(false);
  const [values, setValues] = useState<FieldValues>(() => committed ?? initialValues(cloud));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [notReady, setNotReady] = useState(false);
  const [scriptOpen, setScriptOpen] = useState(false);
  const formId = useId();

  // Reopening is a fresh start: an abandoned half-filled form must not reappear.
  // A handoff still in flight is not abandoned, so `submitted` follows the status.
  useEffect(() => {
    if (!open) return;
    setSubmitted(mode === 'connect' && status === 'connecting');
    setConfirming(false);
    setValues(committed ?? initialValues(cloud));
    setErrors({});
    setNotReady(false);
    setScriptOpen(false);
    // Only re-run when the dialog is (re)opened for a cloud — not on every status tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, cloud]);

  // Derived, never stored: the parent's status is the single source of truth for
  // whether this connection is live, so the two can never disagree.
  const phase = confirming
    ? 'confirm'
    : status === 'connected'
      ? 'details'
      : submitted
        ? 'handoff'
        : 'form';

  const submit = useCallback(() => {
    const found = validateFields(cloud, values);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      announce('Check the highlighted fields');
      return;
    }
    setNotReady(false);
    setSubmitted(true);
    onSubmit(values);
  }, [cloud, values, onSubmit]);

  const checkNow = useCallback(() => {
    if (onCheckNow()) return;
    setNotReady(true);
    announce('Not finished yet');
  }, [onCheckNow]);

  const setField = useCallback((name: string, value: string) => {
    setValues((v) => ({ ...v, [name]: value }));
    // An error that outlives the edit that fixed it is worse than no error at all.
    setErrors((e) => {
      if (!(name in e)) return e;
      const next = { ...e };
      delete next[name];
      return next;
    });
  }, []);

  const cancelConnection = useCallback(() => {
    onCancel();
    onOpenChange(false);
    announce(`${spec.label} connection cancelled`);
  }, [onCancel, onOpenChange, spec.label]);

  const disconnect = useCallback(() => {
    onDisconnect();
    onOpenChange(false);
    announce(`${spec.label} disconnected`);
  }, [onDisconnect, onOpenChange, spec.label]);

  const facts = useMemo(() => spec.facts(values), [spec, values]);
  // Setup-time values, which are not the same as the values that prove a connection.
  const handoffFacts = useMemo(() => spec.handoff.facts?.(values), [spec, values]);
  // Azure alone can land connected-but-incomplete: subscription resources are
  // discovered, directory identities wait on a tenant-wide Graph consent.
  const graphGap = cloud === 'azure';

  const quietDestructive = 'text-[var(--crit-fg)] hover:bg-surface-hover hover:text-[var(--crit-fg)]';

  if (phase === 'form') {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={`Connect ${spec.label}`}
        description={`Read-only discovery. Nothing in your ${spec.resource} is changed.`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            {/* Submits the form below, so Enter and the button take one path. */}
            <Button size="sm" type="submit" form={formId}>
              Connect
            </Button>
          </>
        }
      >
        <form
          id={formId}
          className="space-y-3.5 py-1"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {spec.fields.map((field) =>
            field.kind === 'text' ? (
              <Input
                key={field.name}
                label={field.label}
                placeholder={field.placeholder}
                hint={field.hint}
                error={errors[field.name]}
                value={values[field.name] ?? ''}
                onChange={(e) => setField(field.name, e.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            ) : (
              <div key={field.name}>
                <label className="mb-1 block text-[length:var(--fs-small)] font-medium text-text-secondary">
                  {field.label}
                </label>
                <Select
                  value={values[field.name] ?? field.defaultValue}
                  onValueChange={(v) => setField(field.name, v)}
                  options={field.options}
                  ariaLabel={field.label}
                  className="w-full"
                />
              </div>
            ),
          )}
        </form>
      </Dialog>
    );
  }

  if (phase === 'handoff') {
    const lines = spec.handoff.script ? scriptLines(spec.handoff.script) : 0;
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        title={spec.handoff.title}
        description="One step left. Closing this is safe — it keeps running."
        footer={
          // Abandoning the attempt and backgrounding it are different intentions, so
          // they are different buttons. The reference offered only an ambiguous Close.
          <div className="flex w-full items-center justify-between gap-2">
            <Button variant="ghost" size="sm" className={quietDestructive} onClick={cancelConnection}>
              Cancel connection
            </Button>
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        }
      >
        <div className="space-y-3.5 py-1">
          <ol className="list-decimal space-y-1.5 pl-5 text-[length:var(--fs-body)] text-text-secondary marker:text-text-tertiary">
            {spec.handoff.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>

          {/* A hard failure condition gets its own callout — burying it inside step 2
              of a numbered list is how it gets missed. */}
          {spec.handoff.warning && (
            <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
              {spec.handoff.warning}
            </Banner>
          )}

          {spec.handoff.script && (
            <div className="space-y-1.5">
              <CodeBlock
                code={spec.handoff.script}
                label={`Setup script · ${lines} lines`}
                className={cn(!scriptOpen && '[&_pre]:max-h-28')}
              />
              {/* Acrivault sells identity security. Asking someone to paste a
                  privileged script and hiding it behind a line count is the exact
                  instinct this product exists to fight. */}
              <button
                type="button"
                onClick={() => setScriptOpen((s) => !s)}
                aria-expanded={scriptOpen}
                className="text-[length:var(--fs-small)] text-accent-text underline underline-offset-2 hover:text-text"
              >
                {scriptOpen ? 'Collapse the script' : `Read all ${lines} lines before you run it`}
              </button>
            </div>
          )}

          {spec.handoff.echo && (
            <KeyValueList
              layout="stacked"
              boxed
              items={[
                {
                  label: spec.handoff.echo.label,
                  value: values[spec.handoff.echo.from] || '—',
                  mono: true,
                },
              ]}
            />
          )}

          {handoffFacts && (
            <KeyValueList layout="stacked" boxed items={handoffFacts.map((f) => ({ ...f, mono: true }))} />
          )}

          <div className="pt-0.5">
            <Button size="sm" leadingIcon={<ExternalLink className="h-4 w-4" />}>
              {spec.handoff.cta}
            </Button>
          </div>

          {/* role="status" so the outcome is announced without re-reading the dialog. */}
          <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[length:var(--fs-small)]">
            <Loader2 className="h-4 w-4 animate-spin text-accent-text" aria-hidden="true" />
            <span className="text-text-secondary">Waiting — usually {spec.handoff.wait}.</span>
            <button
              type="button"
              onClick={checkNow}
              className="text-accent-text underline underline-offset-2 hover:text-text"
            >
              Check now
            </button>
            {notReady && <span className="text-text-tertiary">Not finished yet — still running.</span>}
          </div>
        </div>
      </Dialog>
    );
  }

  if (phase === 'confirm') {
    return (
      <Dialog
        open={open}
        onOpenChange={onOpenChange}
        // The title asks the question, so the button does not have to answer "Yes,".
        title={`Disconnect ${spec.label}?`}
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          {/* One identifying line, not five rows of config: at the moment of the
              decision you need to know *which* one, not everything about it. */}
          <KeyValueList
            layout="stacked"
            boxed
            items={[{ label: 'Disconnecting', value: spec.identity(values), mono: true }]}
          />
          <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
            Discovery stops on this {spec.resource}.
            {identitiesFound !== undefined
              ? ` The ${count(identitiesFound)} identities discovered through it stay in Acrivault, but they will not be refreshed.`
              : ' Identities already discovered stay in Acrivault, but they will not be refreshed.'}
          </Banner>
          {/* Reassurance is not a warning; painting it amber teaches people to skim
              amber. It reads as body copy because that is what it is. */}
          <p className="text-[length:var(--fs-small)] text-text-secondary">
            Nothing is changed inside {spec.label} — {spec.leaves}.
          </p>
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`${spec.label} connection`}
      description={
        graphGap ? 'Discovering resources. Directory identities need one more permission.' : 'Discovering. Read-only.'
      }
      footer={
        // Destructive left, dismiss right. The reference put Disconnect between two
        // primary buttons, one keystroke from Done.
        <div className="flex w-full items-center justify-between gap-2">
          <Button variant="ghost" size="sm" className={quietDestructive} onClick={() => setConfirming(true)}>
            Disconnect
          </Button>
          <div className="flex items-center gap-2">
            {graphGap && (
              <Button size="sm" leadingIcon={<ExternalLink className="h-4 w-4" />}>
                Grant permission
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-3.5 py-1">
        <InlineAlert tone="success" title="Connected.">
          Read-only discovery — nothing in your {spec.resource} is changed.
        </InlineAlert>

        {/* You open this to ask "is it working?", so health leads and config follows. */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
            <div className="text-[length:var(--fs-small)] text-text-tertiary">Identities seen here</div>
            <div className="tnum mt-0.5 text-[length:var(--fs-h1)] font-semibold text-text">
              {identitiesFound === undefined ? '—' : count(identitiesFound)}
            </div>
            {identitiesFound === undefined && (
              <div className="text-[length:var(--fs-micro)] text-text-tertiary">After the first scan</div>
            )}
          </div>
          <div className="rounded-[var(--r-md)] border border-border bg-surface-2 p-3">
            <div className="text-[length:var(--fs-small)] text-text-tertiary">Last checked</div>
            <div className="mt-0.5 text-[length:var(--fs-h1)] font-semibold text-text">Just now</div>
          </div>
        </div>

        {graphGap && (
          <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}>
            <span className="font-medium">Directory identities are not being discovered.</span> A tenant administrator
            has to grant read-only Microsoft Graph access — that grant covers the whole Entra ID directory, not this
            subscription alone. This updates on its own once Azure confirms it.
          </Banner>
        )}

        {/* Accordion rather than a bare <details>: its trigger carries a rotating
            chevron, a hover state and a focus ring, so it reads as something you can
            open. A summary with the native marker suppressed and nothing put back
            looks like a disabled field. */}
        <Accordion
          items={[
            {
              value: 'details',
              title: 'Connection details',
              content: <KeyValueList layout="stacked" items={facts.map((f) => ({ ...f, mono: true }))} />,
            },
          ]}
        />
      </div>
    </Dialog>
  );
}

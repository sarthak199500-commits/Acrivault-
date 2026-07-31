import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, FlaskConical, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { usePolicy, useEvaluate, useSavePolicy } from './queries';
import { TokenCanvas } from './TokenCanvas';
import type { PolicyToken } from '@/mocks/types';
import {
  defaultTokens,
  generatedCode,
  isUnsatisfiable,
  lintRule,
  plainEnglish,
  zeroReason,
} from '@/mocks/policy';
import { ScreenHeader } from '@/components/ui/ScreenHeader';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { Dialog } from '@/components/ui/Dialog';
import { Skeleton } from '@/components/ui/Skeleton';
import { RoleRestricted } from '@/components/ui/RoleRestricted';
import { Banner } from '@/components/ui/Banner';
import { useCan } from '@/components/ui/Can';
import { cn } from '@/lib/cn';
import { count, pluralize } from '@/lib/format';
import { toast } from '@/stores/toast';
import { announce } from '@/lib/a11y';

export function PolicyBuilderScreen() {
  const { policyId } = useParams();
  const navigate = useNavigate();
  const isEditing = !!policyId;
  const existing = usePolicy(policyId);

  const canCreate = useCan('policy.create');
  const canTest = useCan('policy.test');
  const canActivate = useCan('policy.activate');
  const readOnly = !canCreate;

  const [name, setName] = useState('');
  const [tokens, setTokens] = useState<PolicyToken[]>(defaultTokens);
  const [tested, setTested] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const seeded = useRef(false);

  // Seed from the loaded policy once (don't clobber subsequent edits).
  useEffect(() => {
    if (isEditing && existing.data && !seeded.current) {
      seeded.current = true;
      setName(existing.data.name);
      setTokens(existing.data.tokens);
    }
  }, [isEditing, existing.data]);

  const english = useMemo(() => plainEnglish(tokens), [tokens]);
  const code = useMemo(() => generatedCode(name, tokens), [name, tokens]);
  const diagnostics = useMemo(() => lintRule(tokens), [tokens]);
  const dead = isUnsatisfiable(diagnostics);
  const evaluation = useEvaluate(tokens);

  const save = useSavePolicy();

  const persist = (status: 'draft' | 'tested' | 'active') => {
    save.mutate(
      { id: policyId, name: name.trim() || 'Untitled policy', tokens, plainEnglish: english, generatedCode: code, status },
      {
        onSuccess: () => {
          toast(
            status === 'active' ? 'Policy saved & activated' : 'Policy saved',
            { description: name || 'Untitled policy', tone: status === 'active' ? 'success' : 'default' },
          );
          navigate('/govern');
        },
      },
    );
  };

  if (isEditing && existing.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  const affected = evaluation.data?.affected;

  return (
    <div>
      <ScreenHeader
        eyebrow={isEditing ? 'Know · Govern · Edit' : 'Know · Govern · New'}
        title="Policy Builder"
        description="Compose a rule from WHEN / AND / THEN tokens. The preview, affected count, and code are illustrative."
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/govern')}>
            Back to policies
          </Button>
        }
      />

      {readOnly && (
        <div className="mb-4">
          <Banner tone="info">You're viewing this policy read-only. Authoring requires an Analyst or Admin role.</Banner>
        </div>
      )}

      <div className="mb-4 max-w-md">
        <Input
          label="Policy name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Quarantine orphaned AI agents"
          disabled={readOnly}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Canvas + actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Rule" description="Add, edit, reorder, or remove conditions; pick a then-action." />
            <CardBody>
              <TokenCanvas
                tokens={tokens}
                onChange={(t) => { setTokens(t); setTested(false); }}
                disabled={readOnly}
                diagnostics={diagnostics}
              />
            </CardBody>
          </Card>

          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              {canTest && (
                <Button
                  variant="secondary"
                  leadingIcon={<FlaskConical className="h-4 w-4" />}
                  loading={evaluation.isFetching}
                  onClick={() => {
                    setTested(true);
                    announce(`Tested — ${pluralize(affected ?? 0, 'identity', 'identities')} ${(affected ?? 0) === 1 ? 'matches' : 'match'}`);
                    toast(`${pluralize(affected ?? 0, 'identity', 'identities')} ${(affected ?? 0) === 1 ? 'matches' : 'match'} this rule`, { description: 'Simulated evaluation.' });
                  }}
                >
                  Test
                </Button>
              )}
              <Button variant="ghost" leadingIcon={<Save className="h-4 w-4" />} onClick={() => persist(tested ? 'tested' : 'draft')} loading={save.isPending}>
                Save draft
              </Button>
              {canActivate ? (
                // Activating a rule that can never match is never intended, so the
                // control is blocked rather than merely warned about. Saving a draft
                // stays open — work in progress is allowed to be wrong.
                <Button
                  leadingIcon={<ShieldCheck className="h-4 w-4" />}
                  onClick={() => setConfirmOpen(true)}
                  disabled={dead}
                  aria-label={dead ? 'Save and activate. Unavailable: this rule can never match any identity.' : undefined}
                >
                  Save &amp; activate
                </Button>
              ) : (
                <RoleRestricted inline note="Only a Security Admin can activate a policy." />
              )}
              {canActivate && dead && (
                <span className="text-[length:var(--fs-small)] text-crit-fg">
                  Resolve the contradiction to activate.
                </span>
              )}
            </div>
          )}

          {tested && evaluation.data && (
            <Card>
              <CardHeader title="Test result" description={`${count(evaluation.data.affected)} of ${count(evaluation.data.total)} identities match.`} />
              <CardBody>
                {evaluation.data.sample.length === 0 ? (
                  <p className="text-[length:var(--fs-small)] text-text-tertiary">No identities match this rule.</p>
                ) : (
                  <ul className="space-y-1">
                    {evaluation.data.sample.map((s) => (
                      <li key={s.id} className="flex items-center justify-between rounded-[var(--r-sm)] border border-border bg-surface-2 px-2.5 py-1.5">
                        <span className="truncate font-mono text-[length:var(--fs-small)] text-text">{s.name}</span>
                        <span className="tnum text-[length:var(--fs-small)] text-text-tertiary">risk {s.riskScore}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>

        {/* Preview + affected + code */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Plain English" action={<Sparkles className="h-4 w-4 text-text-tertiary" aria-hidden="true" />} />
            <CardBody className="space-y-2">
              {/* A contradiction still reads as a well-formed sentence ("risk score is
                  below 60, and risk score is above 80"), which lends it credibility it
                  has not earned. Say so before restating the rule. */}
              {dead && (
                <p className="flex items-baseline gap-1.5 text-[length:var(--fs-small)] font-medium text-crit-fg">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 translate-y-0.5" aria-hidden="true" />
                  This rule can never match any identity.
                </p>
              )}
              <p
                className={cn(
                  'text-[length:var(--fs-body)] leading-relaxed',
                  dead ? 'text-text-tertiary line-through decoration-1' : 'text-text',
                )}
              >
                {english}
              </p>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="pt-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="eyebrow mb-1">Affected identities</div>
                  <p className="text-[length:var(--fs-small)] text-text-tertiary">Precomputed match count · display only</p>
                </div>
                <div className={cn('tnum text-[length:var(--fs-display)] font-semibold', dead ? 'text-crit-fg' : 'text-text')}>
                  {evaluation.isPending ? <Skeleton className="h-7 w-16" /> : count(affected ?? 0)}
                </div>
              </div>
              {/* A bare 0 cannot distinguish "impossible" from "nothing matches today",
                  and those call for opposite responses — fix the rule, or accept it. */}
              {!evaluation.isPending && (affected ?? 0) === 0 && (
                <p className={cn('mt-2 text-[length:var(--fs-small)]', dead ? 'text-crit-fg' : 'text-text-tertiary')}>
                  {zeroReason(tokens, diagnostics) ?? 'No identities match today, but the rule is sound — it will apply when one does.'}
                </p>
              )}
            </CardBody>
          </Card>

          <CodeBlock code={code} label="Generated policy · read-only · illustrative" />
        </div>
      </div>

      <Dialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Activate this policy?"
        description={`This will enforce the rule against ${count(affected ?? 0)} matching identities. Enforcement is illustrative in Wave 1.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={() => { setConfirmOpen(false); persist('active'); }} loading={save.isPending}>
              Activate
            </Button>
          </>
        }
      >
        <p className="text-[length:var(--fs-small)] text-text-secondary">{english}</p>
      </Dialog>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, FlaskConical, Save, ShieldCheck, Sparkles } from 'lucide-react';
import { usePolicy, useEvaluate, useSavePolicy, useTestPolicy, useActivatePolicy } from './queries';
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
import { errorInfo } from '@/lib/apiError';
import { announce } from '@/lib/a11y';
import type { PolicyEvalResult } from '@/mocks/api';

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  /** Id of the persisted policy this screen is editing — set once a draft is saved or tested. */
  const [savedId, setSavedId] = useState<string | undefined>(policyId);
  /** Result of the last dry-run of the *current* rule. Cleared by any edit (FR-005). */
  const [testResult, setTestResult] = useState<PolicyEvalResult | null>(null);
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
  const test = useTestPolicy();
  const activate = useActivatePolicy();

  const input = () => ({
    id: savedId,
    name: name.trim() || 'Untitled policy',
    tokens,
    plainEnglish: english,
    generatedCode: code,
  });

  const onError = (err: unknown) => toast(errorInfo(err).message, { tone: 'critical' });

  const saveDraft = () => {
    save.mutate(
      { ...input(), status: testResult ? 'tested' : 'draft' },
      {
        onSuccess: (policy) => {
          toast('Policy saved', { description: policy.name });
          navigate('/govern');
        },
        onError,
      },
    );
  };

  const runTest = () => {
    test.mutate(
      { ...input(), status: 'tested' },
      {
        onSuccess: ({ policy, evaluation: result }) => {
          setSavedId(policy.id);
          setTestResult(result);
          const phrase = `${pluralize(result.affected, 'identity', 'identities')} ${result.affected === 1 ? 'matches' : 'match'}`;
          announce(`Tested — ${phrase}`);
          toast(`Test complete — ${phrase} this rule`, { description: 'Dry run. Nothing was enforced.' });
        },
        onError,
      },
    );
  };

  const confirmActivate = () => {
    if (!savedId) return;
    activate.mutate(savedId, {
      onSuccess: (policy) => {
        setConfirmOpen(false);
        toast('Policy activated — now enforcing', { description: policy.name, tone: 'success' });
        navigate('/govern');
      },
      onError: (err) => {
        setConfirmOpen(false);
        onError(err);
      },
    });
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

  if (isEditing && existing.isError) {
    return (
      <div>
        <ScreenHeader eyebrow="Know · Govern" title="Policy Builder" />
        <Banner tone="critical">
          {errorInfo(existing.error).message} This policy couldn&apos;t be loaded — go back to the list and try again.
        </Banner>
        <div className="mt-4">
          <Button variant="secondary" size="sm" onClick={() => navigate('/govern')}>
            Back to policies
          </Button>
        </div>
      </div>
    );
  }

  const affected = evaluation.data?.affected;
  // Activation depends on a dry-run of the rule as it stands right now (FR-005),
  // and independently on the rule being satisfiable at all — see the button below.
  const activationBlocked = !testResult || dead;

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
          <Banner tone="info">You&apos;re viewing this policy read-only. Authoring requires an Analyst or Admin role.</Banner>
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
                onChange={(t) => {
                  setTokens(t);
                  // Editing the rule invalidates the test that would have gated activation.
                  setTestResult(null);
                }}
                disabled={readOnly}
                diagnostics={diagnostics}
              />
            </CardBody>
          </Card>

          {!readOnly && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                {canTest && (
                  <Button
                    variant="secondary"
                    leadingIcon={<FlaskConical className="h-4 w-4" />}
                    loading={test.isPending}
                    onClick={runTest}
                  >
                    Test
                  </Button>
                )}
                <Button
                  variant="ghost"
                  leadingIcon={<Save className="h-4 w-4" />}
                  onClick={saveDraft}
                  loading={save.isPending}
                >
                  Save draft
                </Button>
                {canActivate ? (
                  // Two independent gates, both real: FR-005 requires a passing test
                  // against the rule as it stands, and a rule the linter has proven
                  // unsatisfiable must never activate regardless — a contradictory
                  // rule "tested" at 0 matches would otherwise clear FR-005 alone and
                  // slip through.
                  <Button
                    leadingIcon={<ShieldCheck className="h-4 w-4" />}
                    onClick={() => setConfirmOpen(true)}
                    disabled={activationBlocked}
                    aria-label={dead ? 'Save and activate. Unavailable: this rule can never match any identity.' : undefined}
                  >
                    Save &amp; activate
                  </Button>
                ) : (
                  <RoleRestricted inline note="Only a Security Admin can activate a policy." />
                )}
              </div>
              <p className={cn('text-[length:var(--fs-small)]', dead ? 'text-crit-fg' : 'text-text-tertiary')}>
                {dead
                  ? 'Resolve the contradiction above — a rule that can never match cannot be activated.'
                  : activationBlocked
                    ? 'Test is a dry-run — nothing is enforced. A policy must pass a test before it can be activated.'
                    : 'Test is a dry-run — nothing is enforced until you Save & activate.'}
              </p>
            </>
          )}

          {testResult && (
            <Card>
              <CardHeader
                title="Test result"
                description={`${count(testResult.affected)} of ${count(testResult.total)} identities match.`}
              />
              <CardBody>
                {testResult.sample.length === 0 ? (
                  <p className="text-[length:var(--fs-small)] text-text-tertiary">No identities match this rule.</p>
                ) : (
                  <ul className="space-y-1">
                    {testResult.sample.map((s) => (
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
        description={`This will enforce the rule against ${count(testResult?.affected ?? 0)} matching identities. Enforcement is illustrative in Wave 1.`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button onClick={confirmActivate} loading={activate.isPending}>
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

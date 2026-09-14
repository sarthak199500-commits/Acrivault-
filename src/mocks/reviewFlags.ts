import { matchesPolicy } from './policy';
import type { Identity, Policy } from './types';

/**
 * Which rule is asking for a second pair of eyes, resolved at read time.
 *
 * `policyName` is resolved, NOT stamped — the opposite of `PolicyAction.policyName`,
 * and deliberately so. A `PolicyAction` records something that already happened, so
 * renaming the rule afterwards must not rewrite the log. A review flag records
 * nothing: it is a restatement of the CURRENT match set, so it should read with the
 * rule's current name and disappear the moment the rule stops matching.
 */
export interface ReviewFlag {
  policyId: string;
  policyName: string;
}

/** A rule's THEN action, or undefined if it has none yet. */
function actionOf(policy: Policy): string | undefined {
  return policy.tokens.find((t) => t.kind === 'then' && t.subject === 'action')?.value;
}

/**
 * The active `flag for review` rules an identity currently matches.
 *
 * Derived rather than stored (Govern plan, "Out of scope"): there is no flag event
 * and no flag lifecycle. An identity whose risk falls back under a threshold stops
 * being flagged on the next read, with nothing to clean up. The consequence is that
 * nothing records a human ever looked — if review needs to be completed rather than
 * merely noticed, this is the wrong model and the flag needs state of its own.
 *
 * Only Active policies count, matching `PolicyStatus`'s rule that "only Active
 * policies affect live behaviour" (FR-010/FR-011).
 */
export function reviewFlagsFor(identity: Identity, policies: Policy[]): ReviewFlag[] {
  return policies
    .filter((p) => p.status === 'active' && actionOf(p) === 'review' && matchesPolicy(identity, p.tokens))
    .map((p) => ({ policyId: p.id, policyName: p.name }));
}

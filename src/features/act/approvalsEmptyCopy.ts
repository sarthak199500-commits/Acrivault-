import type { ApprovalView } from './useApprovalFilters';

/**
 * Empty-state copy that names the narrowing which produced it.
 *
 * Modelled on `auditEmptyCopy`, and for the same reason: the screen's original
 * empty state explained why the PENDING QUEUE is usually empty — quarantine is
 * the one action Wave 1 splits between proposing and carrying out. Shown under a
 * Declined filter that sentence is not merely unhelpful, it is a wrong answer to
 * the question the reader is actually asking.
 */
export function approvalsEmptyCopy(filter: {
  view: ApprovalView;
  requesters: number;
  search: string;
}): { headline: string; guidance: string } {
  const { view, requesters, search } = filter;
  const narrowed = requesters > 0;

  if (search) {
    return {
      headline: `No requests for “${search}”`,
      guidance: narrowed
        ? 'Nothing under the requester filter names it. Widen the filters to search every request.'
        : 'Nothing in this view names it. Widen the filters to search every request.',
    };
  }

  if (narrowed) {
    return {
      headline: 'No requests in this view',
      guidance: 'Nothing matches the requester filter. Clear it to see every request.',
    };
  }

  if (view === 'declined') {
    return {
      headline: 'No request has been declined',
      guidance:
        'A declined request keeps its reason and the name of whoever refused it, so this is where a refusal can be read back afterwards. Nothing has been refused yet.',
    };
  }

  if (view === 'all') {
    return {
      headline: 'No requests at all',
      guidance:
        'Nothing has been proposed, approved or declined. An Analyst raises a request from a session replay or an identity, and it lands here for an admin to decide.',
    };
  }

  // The unfiltered pending queue — the original copy, unchanged. It says
  // outright what this queue does and does not cover, because an empty table
  // that implied universal two-person control would misrepresent the product.
  return {
    headline: 'Nothing is waiting for a decision',
    guidance:
      'Quarantine is the one action Wave 1 splits between proposing and carrying out: an Analyst recommends it and an admin decides. Every other action — rotation, policy activation, release from quarantine, alert resolution — executes directly for a role that holds the capability, and is recorded in the audit log rather than queued here.',
  };
}

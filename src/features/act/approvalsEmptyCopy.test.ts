import { describe, expect, it } from 'vitest';
import { approvalsEmptyCopy } from './approvalsEmptyCopy';

describe('approvalsEmptyCopy', () => {
  it('keeps the queue explanation for an unfiltered pending view', () => {
    const copy = approvalsEmptyCopy({ view: 'pending', requesters: 0, search: '' });
    expect(copy.headline).toBe('Nothing is waiting for a decision');
    expect(copy.guidance).toContain('Quarantine is the one action Wave 1 splits');
  });

  // The bug this exists to stop: the pending-queue sentence explains why the
  // QUEUE is empty. Under a Declined filter it explains nothing and is simply
  // untrue as a reason.
  it('does not explain an empty declined view with the pending queue’s reason', () => {
    const copy = approvalsEmptyCopy({ view: 'declined', requesters: 0, search: '' });
    expect(copy.headline).toBe('No request has been declined');
    expect(copy.guidance).not.toContain('Quarantine is the one action');
  });

  it('names a search term the reader actually typed', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 0, search: 'svc-billing' });
    expect(copy.headline).toBe('No requests for “svc-billing”');
    expect(copy.guidance).toBe(
      'Nothing in this view names it. Widen the filters to search every request.',
    );
  });

  it('names the requester filter when that is what produced the empty result', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 2, search: '' });
    expect(copy.headline).toBe('No requests in this view');
    expect(copy.guidance).toBe(
      'Nothing matches the requester filter. Clear it to see every request.',
    );
  });

  it('does not offer to widen a filter that is not applied', () => {
    const copy = approvalsEmptyCopy({ view: 'all', requesters: 0, search: '' });
    expect(copy.guidance).not.toMatch(/requester filter/i);
  });
});

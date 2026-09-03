import { describe, expect, it } from 'vitest';
import { auditEmptyCopy } from './AuditScreen';

describe('auditEmptyCopy', () => {
  // The case that motivated this: a reader who clicked View audit trail on a
  // user row never typed a search term, so "try a different search term" was
  // advice they could not act on.
  it('names the target rather than blaming a search term the reader never typed', () => {
    const copy = auditEmptyCopy({ search: 'noor.haddad@acme.com', objects: ['user'], days: 0 });
    expect(copy.headline).toBe('No audit entries for “noor.haddad@acme.com”');
    expect(copy.guidance).toBe(
      'Nothing under the user filter names it. Widen the filters to search the whole log.',
    );
  });

  it('does not offer to widen filters that are not applied', () => {
    const copy = auditEmptyCopy({ search: 'svc-billing', objects: [], days: 0 });
    expect(copy.guidance).toBe('Nothing in the log names it as an actor, action, target, or detail.');
    expect(copy.guidance).not.toMatch(/widen/i);
  });

  it('lists every applied narrowing so the reader knows what to relax', () => {
    const copy = auditEmptyCopy({ search: '', objects: ['policy', 'cloud'], days: 7 });
    expect(copy.headline).toBe('No audit entries in this view');
    expect(copy.guidance).toBe('Nothing was recorded under the policy and cloud filter or the last 7 days.');
  });

  it('reports a date-only narrowing as a fact about the window, not a failed match', () => {
    const copy = auditEmptyCopy({ search: '', objects: [], days: 30 });
    expect(copy.guidance).toBe('Nothing was recorded under the last 30 days.');
  });

  // Reachable only when the log itself is empty, so it must not imply the
  // reader filtered something away.
  it('says the log is empty when nothing is filtered at all', () => {
    const copy = auditEmptyCopy({ search: '', objects: [], days: 0 });
    expect(copy.headline).toBe('No audit entries yet');
    expect(copy.guidance).not.toMatch(/filter|search|widen/i);
  });
});

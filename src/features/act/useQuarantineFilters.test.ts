import { describe, expect, it } from 'vitest';
import {
  applyQuarantineFilter,
  parseQuarantineParams,
  type QuarantineFilter,
} from './useQuarantineFilters';
import type { NhiType, ProducerFacet } from '@/mocks/types';

interface Row {
  id: string;
  name: string;
  type: NhiType;
  producer: ProducerFacet;
  byLabel: string;
  viaLabel?: string;
}

const ROWS: Row[] = [
  {
    id: 'a',
    name: 'svc-billing-00755',
    type: 'service-account',
    producer: 'person',
    byLabel: 'Jordan Rivera · Security Admin',
  },
  {
    id: 'b',
    name: 'key-webhook-00291',
    type: 'api-key',
    producer: 'person',
    byLabel: 'Dana Brooks · Tenant Admin',
  },
  {
    id: 'c',
    name: 'tok-refresh-00412',
    type: 'oauth-token',
    producer: 'policy',
    byLabel: 'Policy · Quarantine dormant OAuth tokens',
  },
  {
    id: 'd',
    name: 'agt-triage-00107',
    type: 'ai-agent',
    producer: 'replay',
    byLabel: 'Alex Kim · Tenant Admin',
    viaLabel: 'Session review · ses_00318',
  },
];

const NONE: QuarantineFilter = { search: '', types: [], producers: [] };
const ids = (rows: Row[]) => rows.map((r) => r.id);
const params = (qs: string) => parseQuarantineParams(new URLSearchParams(qs));

describe('parseQuarantineParams', () => {
  it('reads the three params off the URL', () => {
    expect(params('q=billing&type=api-key,ai-agent&by=policy')).toEqual({
      search: 'billing',
      types: ['api-key', 'ai-agent'],
      producers: ['policy'],
    });
  });

  it('defaults to an unfiltered view when the URL is bare', () => {
    expect(params('')).toEqual(NONE);
  });

  // A stale or hand-edited link should lose the part it got wrong, not return an
  // empty table with nothing on screen explaining why.
  it('drops unknown values instead of narrowing to nothing', () => {
    expect(params('by=policy,wat').producers).toEqual(['policy']);
    expect(params('type=not-a-type').types).toEqual([]);
    expect(applyQuarantineFilter(ROWS, params('type=not-a-type'))).toHaveLength(4);
  });
});

describe('applyQuarantineFilter', () => {
  it('returns every row when nothing is set', () => {
    expect(ids(applyQuarantineFilter(ROWS, NONE))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('ORs the values within the type axis', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['api-key', 'ai-agent'] }))).toEqual([
      'b',
      'd',
    ]);
  });

  // The partition the design accepted (spec, 13 Sep 2026): `person` does NOT
  // include the replay-backed containment, even though a person produced it.
  it('treats the three producer facets as exclusive buckets', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['person'] }))).toEqual(['a', 'b']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['replay'] }))).toEqual(['d']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, producers: ['policy', 'replay'] }))).toEqual([
      'c',
      'd',
    ]);
  });

  it('ANDs across axes', () => {
    expect(
      ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['api-key'], producers: ['policy'] })),
    ).toEqual([]);
  });

  // Deliberately 'z', not a more obvious 'a': every row's byLabel contains a
  // common word with an 'a' in it (Admin, Tenant, dormant…), so a one-char
  // search of 'a' would return all four rows even with the below-minimum gate
  // deleted — the assertion would pass for the wrong reason. 'z' occurs in
  // none of the fixture rows, so removing the gate turns this needle into a
  // real (failing) filter; confirmed by mutating the gate away and re-running.
  it('ignores a search below the minimum instead of narrowing on one keystroke', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'z' }))).toEqual(['a', 'b', 'c', 'd']);
  });

  it('matches the identity name', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'webhook' }))).toEqual(['b']);
  });

  // Why there is no separate "quarantined by" menu: the producer label is in the
  // haystack, so a person's name or a policy's name narrows on its own.
  it('matches the producer label, not just the identity', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'jordan' }))).toEqual(['a']);
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'dormant oauth' }))).toEqual(['c']);
  });

  it('matches a cited session id', () => {
    expect(ids(applyQuarantineFilter(ROWS, { ...NONE, search: 'ses_00318' }))).toEqual(['d']);
  });
});

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  applyQuarantineFilter,
  parseQuarantineParams,
  useQuarantineFilters,
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

  // Two cases, not one: types=['api-key'] ∩ producers=['policy'] is empty under a
  // correct AND, but it is ALSO empty under a broken "always return nothing once
  // both axes are set" mutation — so that case alone can't tell the two apart.
  // The second case has a real non-empty intersection (row a is both
  // service-account and person), so only a genuinely correct AND passes it.
  it('ANDs across axes', () => {
    expect(
      ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['api-key'], producers: ['policy'] })),
    ).toEqual([]);
    expect(
      ids(applyQuarantineFilter(ROWS, { ...NONE, types: ['service-account'], producers: ['person'] })),
    ).toEqual(['a']);
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

/**
 * The one piece of hook-body logic (as opposed to the pure functions above) that
 * needs its own test: `clearTypes` exists because looping `toggleType` over a
 * menu's selected values does NOT clear them all (react-router-dom 6.30.4's
 * `setSearchParams` hands every call in one tick the same render-memoised
 * `searchParams`, not a setState-style accumulator — see the hook's doc comment).
 * No `renderHook` in this repo, so a tiny harness rendered under `MemoryRouter`
 * stands in for one, the same shape `UsersScreen.test.tsx` already uses.
 */
function Harness() {
  const { clearTypes } = useQuarantineFilters();
  const location = useLocation();
  return (
    <div>
      <span data-testid="search">{location.search}</span>
      <button type="button" onClick={clearTypes}>
        clear types
      </button>
    </div>
  );
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Harness />
    </MemoryRouter>,
  );
}

// clearTypes exists because it is NOT equivalent to `filter.types.forEach(toggleType)`:
// verified by a throwaway version of this harness with a second button wired to that
// forEach. Starting from the same `?type=api-key,ai-agent,oauth-token`, that loop left
// `?type=api-key,ai-agent` — only the last value (`oauth-token`) was ever removed, not
// all three — because react-router-dom's `setSearchParams` (6.30.4) hands every call in
// the loop the same `searchParams` memoised from this render, not an accumulator (see
// the hook's doc comment). Not kept as a permanent assertion: encoding a known-bad
// pattern's exact leftover value as a spec is brittle and adds nothing `clearTypes`'s own
// test doesn't already cover.
describe('useQuarantineFilters — clearTypes', () => {
  it('drops the whole `type` param in one write', async () => {
    renderAt('/?type=api-key,ai-agent,oauth-token');
    await userEvent.click(screen.getByRole('button', { name: 'clear types' }));
    const search = new URLSearchParams(screen.getByTestId('search').textContent ?? '');
    expect(search.has('type')).toBe(false);
  });
});

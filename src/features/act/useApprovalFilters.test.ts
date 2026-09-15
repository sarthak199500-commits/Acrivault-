import { describe, expect, it } from 'vitest';
import {
  applyApprovalFilter,
  parseApprovalParams,
  type FilterableApprovalRow,
} from './useApprovalFilters';

const row = (over: Partial<FilterableApprovalRow> = {}): FilterableApprovalRow => ({
  status: 'pending',
  requestedBy: 'usr_2',
  identityName: 'svc-billing-sync',
  requesterName: 'Kai Mensah',
  ...over,
});

describe('parseApprovalParams', () => {
  it('defaults to the pending queue when the URL says nothing', () => {
    expect(parseApprovalParams(new URLSearchParams()).view).toBe('pending');
  });

  // A hand-edited or stale link should lose the part it got wrong rather than
  // land the reader on a view that does not exist.
  it('falls back to pending for a view it does not recognise', () => {
    expect(parseApprovalParams(new URLSearchParams('status=wat')).view).toBe('pending');
  });

  it('reads the requester and search axes', () => {
    const f = parseApprovalParams(
      new URLSearchParams('status=declined&requester=usr_2,usr_3&q=bill'),
    );
    expect(f.view).toBe('declined');
    expect(f.requesters).toEqual(['usr_2', 'usr_3']);
    expect(f.search).toBe('bill');
  });

  it('drops empty requester tokens rather than matching on an empty string', () => {
    expect(parseApprovalParams(new URLSearchParams('requester=,,usr_2')).requesters).toEqual([
      'usr_2',
    ]);
  });
});

describe('applyApprovalFilter', () => {
  const rows = [
    row({ status: 'pending', requestedBy: 'usr_2' }),
    row({ status: 'declined', requestedBy: 'usr_3', identityName: 'svc-legacy-etl' }),
    row({ status: 'approved', requestedBy: 'usr_2', identityName: 'svc-gateway' }),
  ];

  it('shows only pending in the default view', () => {
    const out = applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams()));
    expect(out).toHaveLength(1);
    expect(out[0].status).toBe('pending');
  });

  it('shows every status under all', () => {
    expect(
      applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all'))),
    ).toHaveLength(3);
  });

  it('ANDs the axes together', () => {
    const out = applyApprovalFilter(
      rows,
      parseApprovalParams(new URLSearchParams('status=all&requester=usr_2')),
    );
    expect(out).toHaveLength(2);
  });

  // Same rule the other list screens follow: a search too short to narrow
  // anything must not narrow anything, or "Clear (1)" appears beside an
  // unchanged list.
  it('ignores a search below the minimum length', () => {
    expect(
      applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=s'))),
    ).toHaveLength(3);
  });

  it('searches the identity and the requester together', () => {
    expect(
      applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=legacy'))),
    ).toHaveLength(1);
    expect(
      applyApprovalFilter(rows, parseApprovalParams(new URLSearchParams('status=all&q=kai'))),
    ).toHaveLength(3);
  });
});

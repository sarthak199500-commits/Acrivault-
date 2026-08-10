import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  QueryBoundary,
  Card,
  EmptyState,
  SkeletonTableRows,
  StatusBadge,
  RiskPill,
} from 'acrivault';
import { ShieldAlert } from 'lucide-react';

/* QueryBoundary has no appearance of its own — it is the four-states switch
 * that stands between a TanStack query and a data view. What these cells show
 * is therefore the state it SELECTS, driven by a hand-built query object
 * rather than a live fetch.
 *
 * See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'stretch',
        maxWidth: 560,
      }}
    >
      {children}
    </div>
  );
}

/* A minimal stand-in for the slice of UseQueryResult that QueryBoundary reads:
 * isPending, isError, error, data, refetch. The type-only import is erased at
 * compile time, so this adds no runtime dependency on @tanstack/react-query. */
function query<T>(partial: {
  isPending?: boolean;
  isError?: boolean;
  error?: unknown;
  data?: T;
}): UseQueryResult<T> {
  return {
    isPending: false,
    isError: false,
    error: null,
    data: undefined,
    refetch: () => {},
    ...partial,
  } as unknown as UseQueryResult<T>;
}

interface Identity {
  id: string;
  name: string;
  keyId: string;
  risk: number;
}

const IDENTITIES: Identity[] = [
  { id: 'i1', name: 'payments-api@acrivault', keyId: 'AKIA4RTQ2XN9PLZC', risk: 72 },
  { id: 'i2', name: 'billing-worker@acrivault', keyId: 'AKIA7YHW1KM3QDVN', risk: 41 },
  { id: 'i3', name: 'nightly-export@acrivault', keyId: 'AKIA2FBL8XR5TGWC', risk: 18 },
];

function IdentityRows({ rows }: { rows: Identity[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {rows.map((r, i) => (
        <div
          key={r.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 14px',
            borderTop: i === 0 ? 'none' : '1px solid var(--border)',
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ color: 'var(--text-primary)', fontSize: 'var(--fs-body)' }}>{r.name}</div>
            <div
              style={{
                color: 'var(--text-tertiary)',
                fontSize: 'var(--fs-micro)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {r.keyId}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <RiskPill score={r.risk} />
            <StatusBadge status="active" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** `query.isPending` selects the loading branch. Pass a `loadingFallback`
 *  shaped like the content that is coming — here the inventory table — so the
 *  layout does not jump when the rows land. */
export function Loading() {
  return (
    <Frame>
      <QueryBoundary
        query={query<Identity[]>({ isPending: true })}
        loadingFallback={
          <Card>
            <SkeletonTableRows rows={5} cols={4} />
          </Card>
        }
      >
        {(rows) => <IdentityRows rows={rows} />}
      </QueryBoundary>
    </Frame>
  );
}

/** Loading with `loadingFallback` omitted. The built-in default is
 *  `SkeletonText lines={6}` — usable, but a table-shaped fallback is always
 *  better where the shape is known. */
export function LoadingDefaultFallback() {
  return (
    <Frame>
      <QueryBoundary query={query<Identity[]>({ isPending: true })}>
        {(rows) => <IdentityRows rows={rows} />}
      </QueryBoundary>
    </Frame>
  );
}

/** `query.isError` selects ErrorState automatically — the boundary supplies
 *  the copy, wires `detail` to the error's message, and points the retry at
 *  `query.refetch`. Nothing about this branch is configurable. */
export function Error() {
  return (
    <Frame>
      <Card>
        <QueryBoundary
          query={query<Identity[]>({
            isError: true,
            error: new globalThis.Error('GET /api/v1/identities → 503 Service Unavailable'),
          })}
        >
          {(rows) => <IdentityRows rows={rows} />}
        </QueryBoundary>
      </Card>
    </Frame>
  );
}

/** Resolved-but-empty: `isEmpty` decides, `empty` supplies the node. Both are
 *  required for this branch — without `empty` the boundary falls through and
 *  renders `children` with the empty array. */
export function Empty() {
  return (
    <Frame>
      <QueryBoundary
        query={query<Identity[]>({ data: [] })}
        isEmpty={(d) => d.length === 0}
        empty={
          <Card>
            <EmptyState
              icon={<ShieldAlert className="h-5 w-5" />}
              headline="No identities discovered yet"
              guidance="Connect a cloud to begin discovery."
            />
          </Card>
        }
      >
        {(rows) => <IdentityRows rows={rows} />}
      </QueryBoundary>
    </Frame>
  );
}

/** The populated branch: `children` is a render prop called with the resolved
 *  data, so the view never has to null-check. This is the payoff — the other
 *  three states cost the caller nothing. */
export function Resolved() {
  return (
    <Frame>
      <Card>
        <QueryBoundary
          query={query<Identity[]>({ data: IDENTITIES })}
          isEmpty={(d) => d.length === 0}
        >
          {(rows) => <IdentityRows rows={rows} />}
        </QueryBoundary>
      </Card>
    </Frame>
  );
}

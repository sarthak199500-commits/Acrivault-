import type { ReactNode } from 'react';
import { Pagination } from 'acrivault';

/* See Button.tsx for why scaffolding is inline-styled rather than class-based. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function Caption({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        color: 'var(--text-tertiary)',
        fontSize: 'var(--fs-micro)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
      }}
    >
      {children}
    </span>
  );
}

/** Mid-range page in a long result set. Past seven pages the list compacts to
 *  first · … · current±1 · … · last, so the control keeps a fixed width. */
export function Default() {
  return (
    <Frame>
      <Caption>Page 3 of 20 identities</Caption>
      <Pagination page={3} pageCount={20} onPageChange={() => {}} />
    </Frame>
  );
}

/** Both ellipses present — the widest form the compaction produces. */
export function CompactedMiddle() {
  return (
    <Frame>
      <Caption>Page 11 of 20</Caption>
      <Pagination page={11} pageCount={20} onPageChange={() => {}} />
    </Frame>
  );
}

/** The two boundary states. Previous is disabled on the first page and Next on
 *  the last; disabled arrows keep their footprint rather than disappearing. */
export function Boundaries() {
  return (
    <Frame>
      <Caption>First page · Previous disabled</Caption>
      <Pagination page={1} pageCount={20} onPageChange={() => {}} />
      <div style={{ height: 4 }} />
      <Caption>Last page · Next disabled</Caption>
      <Pagination page={20} pageCount={20} onPageChange={() => {}} />
    </Frame>
  );
}

/** Seven pages or fewer: every page is listed, no ellipsis. */
export function ShortRange() {
  return (
    <Frame>
      <Caption>Page 2 of 5 rotation runs</Caption>
      <Pagination page={2} pageCount={5} onPageChange={() => {}} />
    </Frame>
  );
}

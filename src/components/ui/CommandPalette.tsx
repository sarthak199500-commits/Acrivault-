/* eslint-disable jsx-a11y/click-events-have-key-events -- result selection is handled by the combobox input (arrows + Enter via aria-activedescendant); options are not individually focusable per the listbox pattern */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { CornerDownLeft, KeyRound, Search } from 'lucide-react';
import { ALL_NAV_ITEMS, screenIdentity } from '@/app/nav';
import { listIdentities } from '@/mocks/api';
import { NhiTypeIcon } from './NhiTypeIcon';
import { cn } from '@/lib/cn';

interface Result {
  id: string;
  label: string;
  hint?: string;
  to: string;
  icon: React.ReactNode;
}

const SCREEN_RESULTS: Result[] = [
  ...ALL_NAV_ITEMS.map((i) => ({
    id: `screen:${i.to}`,
    label: screenIdentity(i.to).title,
    hint: i.layer,
    to: i.to,
    icon: <i.icon className="h-4 w-4" aria-hidden="true" />,
  })),
  {
    id: 'screen:/onboarding',
    label: 'Onboarding & Connect',
    hint: 'Get started',
    to: '/onboarding',
    icon: <Search className="h-4 w-4" aria-hidden="true" />,
  },
  // Not a rail item — it is configured once — but it must still be findable, and
  // it is the screen an admin hunts for when nobody can sign in.
  {
    id: 'screen:/settings/sso',
    label: 'Single Sign-On',
    hint: 'Platform',
    to: '/settings/sso',
    icon: <KeyRound className="h-4 w-4" aria-hidden="true" />,
  },
];

export function CommandPalette() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Open via Ctrl/Cmd-K or the top bar search button.
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('acv:open-command-palette', onOpen);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('acv:open-command-palette', onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
    }
  }, [open]);

  const term = query.trim().toLowerCase();

  const screens = useMemo(
    () =>
      term ? SCREEN_RESULTS.filter((s) => s.label.toLowerCase().includes(term)) : SCREEN_RESULTS,
    [term],
  );

  // Identity search (top matches) once the term is meaningful.
  const identityQuery = useQuery({
    queryKey: ['palette-identities', term],
    queryFn: () => listIdentities({ filter: { search: term }, limit: 6 }),
    enabled: open && term.length >= 2,
  });

  const identityResults: Result[] = useMemo(
    () =>
      (identityQuery.data?.rows ?? []).map((idn) => ({
        id: `idn:${idn.id}`,
        label: idn.name,
        hint: 'Identity',
        to: `/discover/${idn.id}`,
        icon: <NhiTypeIcon type={idn.type} className="h-4 w-4" />,
      })),
    [identityQuery.data],
  );

  const results = useMemo(() => [...screens, ...identityResults], [screens, identityResults]);

  useEffect(() => setActive(0), [results.length]);

  const choose = (r: Result | undefined) => {
    if (!r) return;
    setOpen(false);
    navigate(r.to);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(results[active]);
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[var(--z-overlay)] bg-[var(--scrim)] data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]" />
        <Dialog.Content
          aria-label="Command palette"
          className="fixed left-1/2 top-[12vh] z-[var(--z-modal)] w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-[var(--r-lg)] border border-border-strong bg-surface shadow-[var(--shadow-xl)] outline-none data-[state=open]:motion-safe:animate-[overlay-in_var(--dur-2)_var(--ease-standard)]"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <Dialog.Title className="sr-only">Search identities and screens</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Search identities, screens…"
              role="combobox"
              aria-expanded
              aria-controls="acv-palette-list"
              aria-activedescendant={results[active] ? `acv-opt-${results[active].id}` : undefined}
              className="h-12 w-full bg-transparent text-[length:var(--fs-body)] text-text outline-none placeholder:text-text-tertiary"
            />
            <kbd className="hidden rounded-[var(--r-xs)] border border-border bg-surface-2 px-1.5 py-0.5 text-[length:var(--fs-micro)] text-text-secondary sm:inline">
              Esc
            </kbd>
          </div>

          <ul
            id="acv-palette-list"
            role="listbox"
            aria-label="Results"
            className="max-h-80 overflow-y-auto p-1.5"
          >
            {results.length === 0 ? (
              <li className="px-3 py-6 text-center text-[length:var(--fs-small)] text-text-tertiary">
                No matches for “{query}”.
              </li>
            ) : (
              results.map((r, i) => (
                <li
                  key={r.id}
                  id={`acv-opt-${r.id}`}
                  role="option"
                  aria-selected={i === active}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(r)}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-[var(--r-sm)] px-3 py-2',
                    i === active ? 'bg-surface-hover' : '',
                  )}
                >
                  <span className="text-text-tertiary">{r.icon}</span>
                  <span className="min-w-0 flex-1 truncate text-[length:var(--fs-small)] text-text">
                    {r.label}
                  </span>
                  {r.hint && (
                    <span className="shrink-0 text-[length:var(--fs-micro)] text-text-tertiary">
                      {r.hint}
                    </span>
                  )}
                  {i === active && (
                    <CornerDownLeft
                      className="h-3.5 w-3.5 shrink-0 text-text-tertiary"
                      aria-hidden="true"
                    />
                  )}
                </li>
              ))
            )}
          </ul>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

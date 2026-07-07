import { useEffect, useState } from 'react';
import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react';
import type { IdentityFilter } from '@/mocks/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';
import { toast } from '@/stores/toast';

interface SavedView {
  name: string;
  filter: IdentityFilter;
}

const STORAGE_KEY = 'acrivault.savedViews';

function load(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as SavedView[];
  } catch {
    return [];
  }
}

/** Persist a filter set under a name, then re-apply it later. */
export function SavedViews({
  currentFilter,
  onApply,
  hasActiveFilter,
}: {
  currentFilter: IdentityFilter;
  onApply: (filter: IdentityFilter) => void;
  hasActiveFilter: boolean;
}) {
  const [views, setViews] = useState<SavedView[]>([]);

  useEffect(() => setViews(load()), []);

  const persist = (next: SavedView[]) => {
    setViews(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const saveCurrent = () => {
    const name = window.prompt('Name this view');
    if (!name) return;
    const next = [...views.filter((v) => v.name !== name), { name, filter: currentFilter }];
    persist(next);
    toast('View saved', { description: name, tone: 'success' });
  };

  const remove = (name: string) => persist(views.filter((v) => v.name !== name));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-[var(--r-sm)] border border-border bg-surface px-2.5 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text"
        >
          <Bookmark className="h-3.5 w-3.5" aria-hidden="true" />
          Saved views
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-56">
        <DropdownMenuLabel>Saved views</DropdownMenuLabel>
        {views.length === 0 && (
          <p className="px-2.5 py-1.5 text-[length:var(--fs-small)] text-text-tertiary">No saved views yet.</p>
        )}
        {views.map((view) => (
          <DropdownMenuItem key={view.name} onSelect={() => onApply(view.filter)}>
            <span className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-text">{view.name}</span>
              <button
                type="button"
                aria-label={`Delete view ${view.name}`}
                onClick={(e) => {
                  e.stopPropagation();
                  remove(view.name);
                }}
                className="text-text-tertiary hover:text-[var(--crit-fg)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={saveCurrent} disabled={!hasActiveFilter}>
          <span className="inline-flex items-center gap-2 text-accent-text">
            <BookmarkPlus className="h-3.5 w-3.5" aria-hidden="true" /> Save current filter
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

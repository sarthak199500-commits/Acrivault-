import { ChevronDown, ShieldCheck } from 'lucide-react';
import { ROLE_DESCRIPTIONS, ROLE_LABELS, ROLES } from '@/lib/permissions';
import { useUiStore } from '@/stores/ui';
import { announce } from '@/lib/a11y';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from './DropdownMenu';

export function RoleSwitcher() {
  const role = useUiStore((s) => s.role);
  const setRole = useUiStore((s) => s.setRole);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Viewing as ${ROLE_LABELS[role]}. Change role.`}
          className="inline-flex h-9 items-center gap-2 rounded-[var(--r-sm)] border border-border bg-surface px-2.5 text-[length:var(--fs-small)] text-text-secondary hover:bg-surface-hover hover:text-text"
        >
          <ShieldCheck className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
          <span className="hidden lg:inline">{ROLE_LABELS[role]}</span>
          <ChevronDown className="h-3.5 w-3.5 text-text-tertiary" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="min-w-64">
        <DropdownMenuLabel>Viewing as</DropdownMenuLabel>
        {ROLES.map((r) => (
          <DropdownMenuItem
            key={r}
            selected={r === role}
            onSelect={() => {
              setRole(r);
              announce(`Now viewing as ${ROLE_LABELS[r]}`);
            }}
          >
            <span className="flex flex-col">
              <span className="text-text">{ROLE_LABELS[r]}</span>
              <span className="text-[length:var(--fs-micro)] text-text-tertiary">
                {ROLE_DESCRIPTIONS[r]}
              </span>
            </span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

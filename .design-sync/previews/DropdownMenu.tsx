import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  Button,
} from 'acrivault';
import { Trash2 } from 'lucide-react';

/* The menu content renders through a portal, so it escapes any frame we'd wrap
 * it in and is captured with cardMode "single" (see cfg.overrides.DropdownMenu).
 * It is driven open here — `open` is a controlled prop on the Root, and a closed
 * menu renders nothing at all. The TRIGGER is not portaled, so it still needs the
 * app background under it; that backdrop is inline-styled (see Button.tsx). */

/** Row actions on an identity: a section label, a selected item, a disabled item
 *  that explains itself via `title`, and a destructive item below a separator. */
export function Default() {
  return (
    <div
      style={{
        background: 'var(--bg)',
        minHeight: '100vh',
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
      }}
    >
      <DropdownMenu open onOpenChange={() => {}}>
        <DropdownMenuTrigger asChild>
          <Button variant="secondary" size="sm">payments-api@acrivault</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>Row actions</DropdownMenuLabel>
          <DropdownMenuItem selected>Open identity</DropdownMenuItem>
          <DropdownMenuItem>Rotate now</DropdownMenuItem>
          <DropdownMenuItem>Assign owner</DropdownMenuItem>
          <DropdownMenuItem disabled title="Rotation in progress — wait for cutover.">
            Suspend
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--crit-fg)',
              }}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" /> Revoke access
            </span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

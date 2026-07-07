import * as Toast from '@radix-ui/react-toast';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastTone } from '@/stores/toast';

const TONE_STYLES: Record<ToastTone, { border: string; icon: typeof Info; iconClass: string }> = {
  default: { border: 'border-border-strong', icon: Info, iconClass: 'text-text-tertiary' },
  success: { border: 'border-[color-mix(in_srgb,var(--success)_50%,var(--border))]', icon: CheckCircle2, iconClass: 'text-[var(--success)]' },
  warning: { border: 'border-[color-mix(in_srgb,var(--warning)_50%,var(--border))]', icon: AlertTriangle, iconClass: 'text-[var(--warning)]' },
  critical: { border: 'border-[color-mix(in_srgb,var(--critical)_50%,var(--border))]', icon: AlertTriangle, iconClass: 'text-[var(--critical)]' },
};

/** Toast viewport + renderer. Mount once in the shell. */
export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <Toast.Provider swipeDirection="right" duration={4500}>
      {toasts.map((t) => {
        const tone = TONE_STYLES[t.tone];
        const Icon = tone.icon;
        return (
          <Toast.Root
            key={t.id}
            open
            onOpenChange={(open) => !open && dismiss(t.id)}
            className={cn(
              'flex items-start gap-3 rounded-[var(--r-md)] border bg-surface-2 p-3 shadow-[var(--shadow-md)]',
              'data-[state=open]:motion-safe:animate-[drawer-in_var(--dur-2)_var(--ease-standard)]',
              tone.border,
            )}
          >
            <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', tone.iconClass)} aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <Toast.Title className="text-[length:var(--fs-small)] font-medium text-text">{t.title}</Toast.Title>
              {t.description && (
                <Toast.Description className="text-[length:var(--fs-micro)] text-text-secondary">
                  {t.description}
                </Toast.Description>
              )}
            </div>
            <Toast.Close
              aria-label="Dismiss"
              className="shrink-0 text-text-tertiary hover:text-text"
            >
              <X className="h-3.5 w-3.5" />
            </Toast.Close>
          </Toast.Root>
        );
      })}
      <Toast.Viewport className="fixed bottom-4 left-1/2 z-[var(--z-toast)] flex w-[360px] max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-col gap-2 outline-none" />
    </Toast.Provider>
  );
}

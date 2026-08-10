import { Popover, PopoverTrigger, PopoverContent, Button, KeyValueList } from 'acrivault';

/* The popover content renders through a portal, so it escapes any frame we'd
 * wrap it in and is captured with cardMode "single" (see cfg.overrides.Popover).
 * It is driven open here — `open` is a controlled prop on the Root, and a closed
 * popover renders nothing at all. The TRIGGER is not portaled, so it still needs
 * the app background under it; that backdrop is inline-styled (see Button.tsx). */

/** Rich anchored content: a blast-radius breakdown hung off the control that
 *  summarises it, with the arrow pointing back at its trigger. */
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
      <Popover open onOpenChange={() => {}}>
        <PopoverTrigger asChild>
          <Button variant="secondary" size="sm">Blast radius · 14</Button>
        </PopoverTrigger>
        <PopoverContent ariaLabel="Blast radius breakdown">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: 260 }}>
            <span style={{ color: 'var(--text)', fontSize: 'var(--fs-small)', fontWeight: 600 }}>
              How payments-api reaches 14 resources
            </span>
            <KeyValueList
              items={[
                { label: 'Direct grants', value: '2' },
                { label: 'Transitive', value: '9' },
                { label: 'Cascade', value: '3' },
              ]}
            />
            <span style={{ color: 'var(--text-secondary)', fontSize: 'var(--fs-micro)', lineHeight: 1.5 }}>
              Cascade paths run through a secret this identity can read.
            </span>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

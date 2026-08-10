import type { ReactNode } from 'react';
import { Button } from 'acrivault';
import { Plus, Trash2 } from 'lucide-react';

/* Acrivault is a dark-first console: the surface tokens live behind
 * [data-theme], and the preview card's own page background is white. Framing
 * each cell on --bg is what makes these read the way the product does.
 *
 * Scaffolding uses inline styles on purpose. Tailwind only emits utility
 * classes it finds when the app CSS is compiled, so a class used *only* here
 * is absent until the next app build — previews authored and captured in the
 * same pass would grade against a stylesheet that lacks their own layout
 * classes. Inline styles always apply; the components themselves still carry
 * their real classes from the bundle, which is what these cards exist to show. */
function Frame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg)',
        borderRadius: 'var(--r-md)',
        padding: 20,
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {children}
    </div>
  );
}

/** The four variants at their default size — the primary axis of the component. */
export function Variants() {
  return (
    <Frame>
      <Button variant="primary">Rotate credential</Button>
      <Button variant="secondary">View identity</Button>
      <Button variant="ghost">Cancel</Button>
      <Button variant="danger">Revoke access</Button>
    </Frame>
  );
}

/** Both sizes the system defines. xs / lg / xl deliberately do not exist. */
export function Sizes() {
  return (
    <Frame>
      <Button size="sm">Small</Button>
      <Button size="md">Medium</Button>
      <Button size="sm" variant="secondary">Small secondary</Button>
      <Button size="md" variant="secondary">Medium secondary</Button>
    </Frame>
  );
}

/** Leading and trailing icon slots, and the icon-only affordance. */
export function WithIcons() {
  return (
    <Frame>
      <Button leadingIcon={<Plus className="h-4 w-4" />}>Add identity</Button>
      <Button variant="secondary" trailingIcon={<Trash2 className="h-4 w-4" />}>Delete</Button>
      <Button variant="danger" leadingIcon={<Trash2 className="h-4 w-4" />}>Revoke</Button>
    </Frame>
  );
}

/** Statically renderable states. Loading overlays a spinner and sets aria-busy
 *  while holding the button's width; disabled uses a legible muted treatment
 *  rather than a dimmed variant colour. */
export function States() {
  return (
    <Frame>
      <Button>Default</Button>
      <Button disabled>Disabled</Button>
      <Button loading>Loading</Button>
      <Button variant="secondary" disabled>Secondary disabled</Button>
      <Button variant="danger" loading>Revoking</Button>
    </Frame>
  );
}

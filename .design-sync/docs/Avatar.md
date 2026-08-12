---
category: Status
---

Represents an actor in a list or header — either a **person** (rendered as initials
derived from the first two words of `name`) or a **non-human identity** (rendered via
the `icon` slot, normally an `NhiTypeIcon`). Service accounts and agents have no
initials, so the type glyph stands in for them.

The optional `status` prop pins a `StatusDot` to the bottom-right, ringed in the
surface colour so it stays legible against the avatar edge. Reach for it when
liveness or health matters in the list itself; leave it off when the row already
shows a `StatusBadge`, since two competing state signals in one row read as noise.

Avatar is decorative — when a `name` is given the initials circle is `aria-hidden`,
because the adjacent name text is what actually identifies the row. Never use an
avatar as the only identifier for a user. Three sizes: `sm` for table rows, `md` for
lists, `lg` for detail headers.

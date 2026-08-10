---
category: Controls
---

An icon-only action for dense surfaces: table row actions, card headers, toolbars. Use it only where space is genuinely tight and the icon is unambiguous on its own — otherwise use a Button with `leadingIcon`, which keeps the verb visible.

`ghost` is the default and stays invisible until hover, which is what makes a row of them read as one cluster rather than four competing buttons. `secondary` adds a border and a raised surface for a button that has to hold its own outside a cluster.

`label` is required and becomes both `aria-label` and the native `title` tooltip, so it is the only thing a screen-reader or hover user gets. Write it as the action ("Rotate credential"), not the icon ("Refresh").

Size the icon to the button: `h-3.5 w-3.5` inside `size="sm"`, `h-4 w-4` inside `size="md"`. `md` matches the height of a `md` Button so the two can sit on one toolbar row.

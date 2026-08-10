---
category: Navigation
---

A right-side panel for inspecting one record without leaving the list behind it: Identity Detail, Alert detail, the Session Replay side rail. Use it when the user will open, read, act, and return — and when keeping the underlying table visible is part of the point.

Drawer versus Dialog versus ConfirmDialog: Drawer is for depth (a lot of content, scrollable, the user stays oriented in the list); Dialog is for a focused task that interrupts (a form, a choice); ConfirmDialog is for a single irreversible yes/no. If the panel's content deserves its own URL and back-button behaviour, promote it to a route instead of a drawer.

The panel is structured for you — `title` and `description` render into a bordered header alongside a close button, `children` scroll in the body, and `footer` pins actions to the bottom edge. Width comes from `--panel-w` by default; override only for genuinely wider content, and expect a full-width panel below the tablet breakpoint.

Focus is trapped in the panel and returned to the opener on close, including the routed case where the whole dialog unmounts on navigation and Radix never sees an open-to-closed transition. Escape closes. Because the body scrolls independently, put anything the user must see — a warning, the primary action — in the header or footer rather than at the bottom of a long body.


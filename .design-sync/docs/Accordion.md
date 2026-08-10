---
category: Navigation
---

Progressive disclosure for grouped content: a stack of headers whose panels expand in place. Reach for it when a screen carries several optional or reference blocks — glossaries, policy exceptions, advanced settings — and showing them all at once would bury the primary task.

Use `type="single"` (the default, and collapsible) when the panels are alternatives and only one is worth reading at a time; use `type="multiple"` when a user may want two panels open side by side. `defaultValue` opens one panel on mount — set it when there is an obvious first thing to read, omit it when the headers themselves are the index.

Prefer Tabs over Accordion when the sections are peers of equal importance that the user will switch between repeatedly; Accordion is for content that is usually collapsed. Do not nest Accordions — the indentation stops reading as hierarchy after one level.

Headers are real buttons carrying `aria-expanded`, reachable by Tab and toggled with Enter or Space; the chevron rotates from the open data-state rather than from an icon swap. Panel content stays in document order beneath its own header.


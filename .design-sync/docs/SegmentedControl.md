---
category: Controls
---

A compact switch between a few mutually exclusive renderings of the same content — Table vs Graph on the inventory, list vs grid on results. It changes how you are looking at something, not what the data is.

That distinction is the whole selection rule: use RadioGroup when the choice is a value being saved, Tabs when the panels hold genuinely different content, and SegmentedControl when it is one dataset seen two ways. Two or three segments; past three it outgrows its row and Tabs is the better fit.

`ariaLabel` is required — it names the group, since "Table" and "Graph" alone do not say what they switch. Each segment carries `aria-pressed`, and the selection shows as an accent-tinted background plus accent text, so it never depends on colour alone.

`icon` is optional per option, but apply it to all segments or none. Size icons to `h-3.5 w-3.5` in both `sm` and `md`. `sm` (28px) sits in a filter bar next to a `sm` Button; `md` (32px) is the default.

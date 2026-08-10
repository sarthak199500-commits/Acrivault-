---
category: Navigation
---

In-page sectioning of a single record or screen: Overview / Permissions / Activity on an identity, Active / History on Rotate. Use it when the sections are peers of roughly equal importance that a user will switch between repeatedly, and when each section is worth a full panel of its own.

Tabs is fully controlled — pass `value` and `onValueChange` and own the state; there is no uncontrolled mode. Pair it with `TabPanel` for each section. Keep labels to one or two words, and fold counts into the label (`Active (3)`) rather than adding a separate badge. Two tabs is the practical minimum and about five the maximum before the row stops being scannable; past that use a sidebar or a Select.

Tabs answers "which facet of this record"; Breadcrumb answers "where am I" and stacks above it. Prefer Accordion when the sections are usually collapsed and only occasionally opened, and SegmentedControl when the choice filters one view rather than swapping panels.

Triggers are arrow-key navigable as a single tab stop, the active trigger carries `aria-selected` plus the accent underline, and each panel is associated with its trigger. Only the active panel is mounted, so panel content must not hold state the user expects to survive a tab switch.


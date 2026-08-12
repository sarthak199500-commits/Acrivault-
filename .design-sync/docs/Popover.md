---
category: Navigation
---

An anchored surface for rich content that would clutter the page if it were always visible: a blast-radius breakdown, a filter builder, a definition with a link out. It stays open while the user reads or interacts, and points back at its trigger with an arrow.

Choose between the three anchored surfaces by what the surface holds. Popover holds *content* — arbitrary nodes, possibly interactive. DropdownMenu holds *commands*, and closes when one is chosen. Tooltip holds a short passive *hint* shown on hover or focus, never anything clickable. A Popover containing only a list of verbs should be a DropdownMenu; a Tooltip containing a button should be a Popover.

Compose it from `Popover`, `PopoverTrigger` (with `asChild` so your own control stays the trigger), and `PopoverContent`; use `PopoverAnchor` when the visual anchor is not the thing the user clicks. The trigger is deliberately unstyled — style it yourself. Control placement with `side` and `align` rather than wrapper margins.

Always pass `ariaLabel` — the content has `role="dialog"` and is otherwise announced unnamed. Focus moves into the popover on open, Escape closes it and returns focus to the trigger, and the content is dismissed on outside click. Because it can be dismissed, never make a Popover the only route to information the user needs.


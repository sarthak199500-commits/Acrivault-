---
category: Navigation
---

A menu of commands hung off a trigger — the row-actions "…" on an inventory table, the account menu in the top bar. Every item is an action the user can take right now; the menu closes as soon as one is chosen.

The three anchored surfaces are not interchangeable. DropdownMenu is a list of *commands* and its items are activated. Popover holds *content* — rich, arbitrary, possibly interactive — and stays open while the user reads or works in it. Tooltip is a passive *hint* that appears on hover or focus and can never hold anything the user must click. If you find yourself putting a button inside a Tooltip, you wanted a Popover; if your Popover is just a list of verbs, you wanted a DropdownMenu.

Compose it from `DropdownMenuTrigger` (use `asChild` to keep your own Button as the trigger), `DropdownMenuContent`, and `DropdownMenuItem`. Group with `DropdownMenuLabel`, divide with `DropdownMenuSeparator`, and put destructive items last, below a separator, in the critical foreground colour. Give a disabled item a `title` explaining why it is unavailable — a greyed row with no reason is a dead end. `selected` renders a trailing check for state-carrying items.

Items are arrow-key navigable with typeahead, Escape closes and returns focus to the trigger, and the open menu traps pointer interaction with the page behind it. The highlighted state is driven by Radix's `data-highlighted` — it cannot be forced statically, so it is absent from these cards.


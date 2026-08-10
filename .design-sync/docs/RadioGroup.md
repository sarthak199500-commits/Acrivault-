---
category: Controls
---

One choice from a small set of mutually exclusive options, all visible at once. Backed by Radix, so the group is a single tab stop and the arrow keys move the selection with roving focus.

Use it over Select when the options carry consequences the user should read before choosing — each option takes an optional `description`, and that is the whole reason to prefer it. Use Select when the list is long or the labels are self-evident; use SegmentedControl when the choice switches a view rather than setting a value.

Every option needs a `label`; `description` is optional per option, but be consistent within a group. A single option's `disabled` dims its entire row, label and description together, so put the reason it is unavailable in the description.

`orientation="horizontal"` wraps the options into a row — good for two or three short labels, wrong once descriptions are involved. Pass `ariaLabel` to name the group itself, since the individual option labels do not say what is being chosen.

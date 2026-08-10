---
category: Feedback
---

A centred block that explains why a view has nothing in it and offers the next
step: an optional glyph in a tinted tile, a headline, one line of guidance, and
an optional action.

EmptyState vs `ErrorState` is the distinction to get right: **empty is not
broken**. Nothing failed — the tenant simply has no policies yet, or the
filters exclude everything. Use ErrorState only when a request actually
rejected, and note the visual tell that keeps them apart: ErrorState's icon
tile is critical-tinted and it offers a retry, EmptyState's tile is neutral and
it offers a *forward* action. Never phrase an empty state as a failure.

Only `headline` is required — `icon`, `guidance`, and `action` each render only
when passed, and none is defaulted, so `<EmptyState headline="Identity not
found" />` is a legitimate one-line form for a detail panel. Match the action
to the absence: first-run emptiness earns a primary button that starts
onboarding, filtered-to-nothing earns a secondary "Clear filters", and an
absence that resolves on its own (sessions arriving as agents act) should have
no button at all rather than an invented one.

It supplies its own generous vertical padding, so drop it straight into a
`Card` with no extra spacing. On data views, pass it to `QueryBoundary`'s
`empty` prop rather than branching on `length === 0` by hand.

---
category: Feedback
---

A shimmering placeholder that holds the shape of content that has not arrived
yet. `Skeleton` is the bare primitive and has **no intrinsic size** — it takes
its dimensions entirely from `className`, so you shape it like the thing it is
standing in for. `SkeletonText` (stacked lines, last one short) and
`SkeletonTableRows` (a divided grid with a wider first column) are the two
ready-made compositions.

Skeleton vs `ProgressBar`: Skeleton means "this content is still loading" and
says nothing about how long it will take; ProgressBar means "this work is
running and here is how far along it is". A fetch gets a Skeleton, a rotation
batch gets a ProgressBar. Never use a centred spinner where a Skeleton would
do — the point of a skeleton is that the layout does not jump when the data
lands, so mirror the real geometry (a circle for an avatar, the
`--size-kpi-tile` height for a KPI tile, matching row and column counts for a
table).

In practice you rarely mount one by hand: `QueryBoundary` renders
`SkeletonText` as its default `loadingFallback`, and list screens pass a
`SkeletonTableRows` shaped like their table.

Accessibility: every skeleton is `aria-hidden="true"` — it is decoration, not
content, and the surrounding region should carry the loading semantics
instead. The shimmer is behind `motion-safe:`, so it stops under
`prefers-reduced-motion`.

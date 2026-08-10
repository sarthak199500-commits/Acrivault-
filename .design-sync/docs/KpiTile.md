---
category: Status
---

A top-of-screen metric tile: label, value, optional trend and sparkline. Numeric
values pass through `compact()` (2243 renders as "2.2K") while string values are
shown verbatim, which is how non-numeric metrics like "6 min ago" or "6.3%" fit the
same row. Tiles are `h-full` and expect to sit in a grid — they fill their cell
rather than sizing themselves.

Delta tone follows **favourability, not sign**. Up is good by default; set
`deltaInverted` for lower-is-better metrics (risk, drift, orphan counts) so a rise
reads as a warning. The direction is folded into the tile's accessible name, so a
screen-reader user hears the trend without relying on the arrow glyph.

`prominent` leads a row with a larger value and a stronger border — use it once per
grid, for the metric the screen is about. `risk="critical"` is the single place a KPI
earns colour, taking the critical tone on both the chip and the value; reserve it for
a genuine security signal, never for "this number is big".

Pass `to` to make the whole tile a drill-down link with a filter applied. Note that
`to` renders a react-router `Link`, so a tile using it must be mounted inside a
Router — the previews here deliberately omit it for that reason.

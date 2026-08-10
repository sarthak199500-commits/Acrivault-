---
category: Status
---

A provider chip — a small coloured dot plus the spelled-out provider name (AWS,
Azure, GCP). The dot draws one categorical hue from the colourblind-aware data-viz
palette, and those hues are shared with the inventory graph and the provider filters,
so a badge and a chart series for the same cloud always agree.

Only the dot carries colour; the label stays in the neutral secondary tone so the
text passes AA in both themes. This is a **categorical** colour, not a severity one —
seeing amber on an AWS badge never means "warning". When a provider chip and a
`RiskPill` sit in the same row, the pill is the one carrying meaning.

Use ProviderBadge in roomy surfaces — filters, legends, detail panels, chart keys.
Use `CloudGlyph` instead in dense table cells, where it abbreviates Azure to "AZ" and
drops colour entirely to keep the table calm. The exported `PROVIDER_COLOR` and
`PROVIDER_LABEL` maps let charts and filter menus reuse the same hue and name without
rendering the badge itself.

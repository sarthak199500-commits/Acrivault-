---
category: Status
---

A compact, monochrome marker for the source cloud — AWS, GCP, or Azure (abbreviated
"AZ"). It is a text chip, not a vendor logo: deliberately colourless so the resting
inventory table stays near-monochrome and the only coloured thing on screen is risk.

Use CloudGlyph in **dense** surfaces — table cells, multi-source clusters — where
horizontal space is scarce and the provider is supporting detail. Use `ProviderBadge`
instead in **roomier** surfaces like filters, legends, and detail panels: it spells
the provider out ("Azure", not "AZ") and carries a small categorical hue from the
colourblind-aware palette, which is what makes provider filters and chart legends
readable.

All three values render identically apart from the abbreviation. That is intended,
not an oversight — provider identity here is conveyed by the letters alone. The
`title` attribute carries the full uppercase provider name for hover and assistive
tech.

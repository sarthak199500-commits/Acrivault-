---
category: Navigation
---

A trail showing where the current record sits in the hierarchy, and a one-click path back up it. Use it at the top of detail screens — an identity, a policy, a rotation run — where the user arrived from a list and needs to get back to it.

Give every ancestor crumb a `to` and leave the last crumb without one. The component renders the final crumb as plain text with `aria-current="page"` and the primary text colour, so the current location reads as a label rather than a dead link. Keep the trail to the real route ancestry — do not synthesize levels a user cannot navigate to.

Breadcrumb answers "where am I"; Tabs answers "which facet of this record". They stack rather than compete: a detail screen commonly has a Breadcrumb above its title and Tabs below it. If the path is only one level deep, a single back link is clearer than a two-crumb trail.

The trail is a `nav` landmark labelled "Breadcrumb" wrapping an ordered list, so assistive tech can jump to it and announce depth. Separators are decorative chevrons marked `aria-hidden`; at narrow widths the list wraps rather than truncating, keeping the current page visible.


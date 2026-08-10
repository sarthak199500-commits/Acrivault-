---
category: Navigation
---

Server-style paging for long result sets — the identity inventory, rotation history, audit events. Use it when the user needs a stable, addressable position in the results ("page 3 of 20"), or when the row count is large enough that fetching everything is wasteful.

Past seven pages the page list compacts to first · … · current±1 · … · last, so the control keeps a near-fixed width however deep the set runs. Below that threshold every page is listed. Previous and Next disable at the boundaries rather than disappearing, so the control does not shift horizontally as the user pages through.

Prefer infinite scroll or a "load more" button for feed-shaped, recency-ordered content where exact position does not matter. Pagination is the right call when the surrounding screen also offers sorting and filtering, which make a page number meaningful.

The control is a `nav` landmark labelled "Pagination"; the active page carries `aria-current="page"`, and both arrows have explicit labels since their only visible content is an icon. Page numbers use tabular figures so the row does not jitter as digits change.


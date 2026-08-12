---
category: Feedback
---

A multi-row progress display: a running grand total, then one labelled row per
category with its own bar and count. Built for onboarding's discovery scan,
where identities stream in across several types (or several cloud accounts) at
once.

Use ScanProgress instead of a stack of `ProgressBar`s whenever the rows belong
to one operation and the user cares about the aggregate as much as the parts —
it composes `ProgressBar` at `size="sm"` internally and adds the alignment,
the count column, and the total. Use a single ProgressBar when there is only
one quantity to report.

`rows` is free-form (`id`, `label`, optional `icon`, `value`, `total`), so the
same component reports per-identity-type or per-account progress; `icon` is
optional and the label column simply loses its glyph without it. Note the
total is the sum of the row **values**, not of the row totals — it is "how much
have we found", not "how far through are we".

The `scanning` flag is the live/settled switch: it changes the eyebrow from
"Discovered" to "Discovering…" and sets `aria-busy`. The whole block is an
`aria-live="polite"` region so counts are announced as they climb without
interrupting, and every figure uses tabular numerals so the columns do not
jitter while they update.

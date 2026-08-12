---
category: Feedback
---

A single horizontal track reporting how far along a known piece of work is —
a rotation batch, a scan, a quota being consumed.

The distinction that matters most in this system is ProgressBar vs `Skeleton`.
Skeleton is for content that has not arrived yet: it stands in for the shape of
the thing being loaded and says nothing about duration. ProgressBar is for work
that is *running* and whose progress can be reported. If you can put a number or
a running count on it, use ProgressBar; if you are just waiting for a fetch to
resolve, use Skeleton. For multi-category progress with a running total, use
`ScanProgress`, which composes ProgressBar per row rather than reinventing it.

Omitting `value` switches the bar to indeterminate — the fill becomes a sliver
that sweeps the track and the percentage is dropped from the label, since there
is no figure to report. Use that only when the duration is genuinely unknown.
`tone` colours the fill alone (the track stays neutral) and encodes severity, not
a different component: `critical` on a quota bar means near-limit, not failed.

Accessibility: the track is a `role="progressbar"` with `aria-valuenow` /
`aria-valuemin` / `aria-valuemax`, and `aria-valuenow` is deliberately omitted
when indeterminate. `aria-label` falls back to "Progress" if no `label` is
passed, so pass one whenever the surrounding row does not already name the work.

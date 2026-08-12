---
category: Feedback
---

A section-level message: an icon, an optional bold title, and a line of
secondary text. No fill, no border, no padding of its own — it is designed to
sit *inside* a form, a card body, or a settings row without competing with the
content it annotates.

Use InlineAlert for anything scoped to one field, one section, or one record:
a validation note, a caveat about the value the user just picked, a confirmation
that a single setting saved. Use `Banner` instead when the message is about the
entire view — Banner's fill and border earn their weight at page level and
overwhelm at field level. The two are not interchangeable by tone alone.

InlineAlert has four tones to Banner's three: it adds `success`, because a
"saved" confirmation attached to a specific field is a legitimate inline note
(whereas a page-level success belongs in a toast). Both `title` and `children`
are optional and render independently — title alone gives a terse status line,
children alone gives a plain footnote. Like Banner, `critical` renders
`role="alert"` and every other tone `role="status"`, and the icon is
`aria-hidden` since the tone is already carried by the text.

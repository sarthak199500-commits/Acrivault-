---
category: Controls
---

Multi-line text entry for free-form context: rotation notes, exception justifications, handover comments. It mirrors Input's API — same `label`, `hint`, `error`, and `hideLabel` props — so the two read as one family in a form.

Use Input when the answer is a single value. Use Textarea when you are asking someone to explain something, and expect them to write more than a phrase.

`showCount` needs `maxLength` to render; it draws a live counter in the footer row and seeds the count from the mounted value rather than zero. Unlike Input, the counter and an `error` can occupy that footer row together — the error takes the left slot, the count stays right.

The field starts at five rows and grows only if the user drags it; there is no auto-resize. Pick a `maxLength` that fits what you are actually asking for, and put the limit in the hint so it is known before it is hit rather than discovered at the wall.

---
category: Navigation
---

A single-decision modal for an action that is destructive, expensive, or hard to reverse: revoking a credential, deleting a policy, forcing a cutover. It is a preset over Dialog — small size, a fixed cancel/confirm footer, and a `pending` state that spins the confirm button while the mutation is in flight.

Reach for ConfirmDialog when the answer is yes-or-no and the only content is the consequence. Reach for Dialog directly when the modal contains a form, several actions, or content the user must read and navigate. Never use a Drawer to confirm — a drawer implies an inspectable side surface, not a decision the user must resolve before continuing.

Set `confirmVariant="danger"` and name the consequence in the button (`Revoke access`, not `OK`) for anything permanent. State the blast radius in the body — resource counts, key IDs, who loses access — so the cost is on screen at the moment of the decision, not one screen back. Keep `cancelLabel` meaningful when the stakes are high (`Keep credential` beats `Cancel`).

Focus is trapped inside the dialog and returned to the opener on close, Escape closes, and both footer buttons are disabled while `pending` so a slow mutation cannot be double-submitted.


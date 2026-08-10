---
category: Controls
---

A segmented one-time-code field: one box per digit, for email verification and MFA challenge entry. Use it only for short numeric codes the user is transcribing from somewhere else — never for passwords, and never for anything they have to compose themselves.

For any other short value, use Input. The segmented treatment is a promise that the value has a known fixed length, so `length` must match the code you actually send.

It handles the whole keyboard story: typing advances, Backspace clears then retreats, arrows move, and pasting a full code fills every box at once. Each box is individually labelled ("Verification code, digit 3 of 6") and only the first carries `autocomplete="one-time-code"`, so the OS suggestion lands in the right place.

`onComplete` fires when the last box fills — submit from there rather than making the user find a button. `autoFocusFirst` focuses box one on mount; `refocusSignal` returns focus to box one when you bump it, which is what you want after clearing an incorrect code. `error` marks every box critical and prints the message with `role="alert"`, so validity is never colour-only.

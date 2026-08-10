---
category: Controls
---

A single-thumb slider for a bounded numeric value where the approximate position matters more than the exact digit — risk thresholds, rotation intervals, dormancy windows.

Use an Input with a numeric type when the precise value is the point, or when users arrive knowing the number they want. A slider is for tuning, not for entry.

It renders no readout of its own. Always pair it with a label and a live value in a header row above the track, as the product does — without one, a keyboard user changing the value gets no visible confirmation of where it landed.

`min`, `max`, and `step` reshape the scale without changing the visuals; the track always spans its container's full width, so the component needs a width from its parent. Pass `ariaLabel` — it lands on both the root and the thumb. Disabled dims the whole control to 50% so it never reads as a slider parked at an odd value.

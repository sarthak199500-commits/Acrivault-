---
category: Status
---

A plain-English answer to "what will this person actually be able to do?", shown on
the invite and role-change flows. It renders a checked can-list and a muted
cannot-list for the given role.

It is **truthful by construction**: rather than restating permissions in prose, it
filters a fixed list of described capabilities through `can(role, capability)` from
`lib/permissions.ts`. When the permission matrix changes, this component changes with
it — there is no second copy of the rules to fall out of date. If a capability needs
describing here, add it to the `DESCRIBED` list in the component, not to a caller.

Use it wherever a role is being *assigned* and the person choosing needs to
understand the consequence — an invite dialog, a role switcher confirmation. It is
not a settings control and not a permissions editor; it only explains. For the
narrowest roles the cannot-list is longer than the can-list, which is intended: the
point is to make an over- or under-scoped invite obvious before it is sent.

Each row pairs its icon with text and a screen-reader-only "Can:" / "Cannot:" prefix,
so the grant/deny distinction never rests on the check-versus-dash glyph alone.

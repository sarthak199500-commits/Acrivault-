---
category: Status
---

A single lucide glyph per non-human-identity type: Bot for AI agents, Server for
service accounts, KeyRound for API keys, Ticket for OAuth tokens, Cpu for workload
identities. AI agents lead the product, so Bot is the glyph users learn first.

The component renders the icon and nothing else — no chrome, no colour, no size of
its own. It inherits the surrounding text colour and takes its dimensions from
`className` (default `h-4 w-4`). It is marked `aria-hidden`, so **it is never
identifiable on its own**: always render the type's label from `NHI_TYPE_LABELS`
beside it, or wrap it in a `Tag` that carries the text.

Use it as the leading marker in inventory rows, as the `icon` of a `Tag` or
`KpiTile`, or inside an `Avatar` to stand in for an identity that has no initials.
Because it is a bare glyph rather than a chip, it composes into other components
rather than sitting on a surface by itself.

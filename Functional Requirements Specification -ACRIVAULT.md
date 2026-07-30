![][image1]

**ACRIVAULT**

*Securing every identity that has no face*

 

**ACRIVAULT · WAVE 1 · BA & DESIGNER · CONFIDENTIAL**

**Functional Requirements Specification**

*Wave 1 (Prototype → MVP) — Detailed Product Requirements*

The detailed functional specification for Acrivault Wave 1, shared with the Business Analyst and UI/UX Designer. For each feature and screen it defines purpose, users, data shown, user actions, states, business rules, and acceptance criteria — enough to write requirements from and design from. IP-sensitive internals are marked Architect-owned throughout.

**ACRIVAULT INC.  ·  HOUSTON, TEXAS  ·  MAY 2026**

*Confidential — Internal Use Only*

 

| HOW TO READ THIS DOCUMENT *This is the shared source of truth for WHAT the Wave-1 product does. BA: write your atomic requirements and acceptance criteria from each section, tracing back to it. Designer: design each screen and all its states from each section. Where you see ‘Architect-owned’, the user-facing behaviour is specified here but the internal logic (algorithms, enforcement, scoring) is defined by the Architect — spec/design the surface, not the internals. Anything still open is marked ‘OPEN’ with who decides it.* |
| :---- |

# **1 · Product Overview**

Acrivault is an AI-native security platform for non-human identities (NHIs) — service accounts, API keys, OAuth tokens, workload identities, and AI agents. Wave 1 delivers the foundation: discover every NHI across a customer’s cloud and SaaS, show its risk, let the customer govern it with policy, monitor behaviour, and act (rotate credentials). The product is organised as three layers — SEE (Identity Cloud), KNOW (Control Plane), ACT (Identity Firewall) — and six pillars: Discover, Govern, Monitor, Rotate, Intelligence (Wave 1); Resilience (Wave 2).

## **1.1 · Wave 1 scope (what to build)**

| Pillar | Layer | Wave-1 capability |
| :---- | :---- | :---- |
| **Discover** | See | Agentless inventory of every NHI across cloud & SaaS |
| **Govern** | Know | No-code policy engine; ownership; drift detection |
| **Monitor** | Know | Behavioural baseline; risk scoring; alerts |
| **Intelligence** | Know | AI agents as first-class identities; session replay |
| **Rotate** | Act | Credential lifecycle; emergency rotation; history |
| **Resilience** | Know | Wave 2 — concept only in Wave 1 |

## **1.2 · Users & roles**

Wave 1 assumes a small set of roles. The BA owns the detailed permission matrix; this is the starting model:

| Role | Can do |
| :---- | :---- |
| **Security Admin** | Full access: connect sources, write policy, rotate, manage users |
| **Security Analyst** | View inventory, investigate, respond to alerts, run reviews; limited policy |
| **Viewer / Auditor** | Read-only: dashboards, inventory, evidence, audit log |

 

# **2 · Cross-Cutting Behaviour (applies to every screen)**

## **2.1 · States — design and spec all four, every screen**

•  	**Loading:**  data is loading; show skeletons/placeholders, never a blank flash.

•  	**Empty:**  no data yet or no results; show a helpful empty state with the next action.

•  	**Error:**  something failed; show what happened and what the user can do.

•  	**Populated:**  the normal, data-present state.

## **2.2 · Identity model (decided — applies across screens)**

•  	**One identity:**  the same NHI across AWS/Azure/GitHub is ONE correlated logical identity, expandable to its source instances. Not separate rows per cloud.

•  	**System of record:**  source cloud is authoritative for its own attributes; Acrivault owns the derived layer (risk, correlation, governance). Conflicting attributes are surfaced, never silently resolved.

•  	**Orphaned:**  no owner / no active workload / dangling \= first-class high-risk state; prominent status, dedicated filter, path to remediation.

•  	**Differentiate by type, dedupe by correlation:**  show a total for scale AND break down by type (AI agents prominent); counts are on correlated, deduplicated identities (same identity across clouds counts once).

 

## **2.3 · NHI types to represent**

AI agents, service accounts, API keys, OAuth tokens, workload identities. Each identity has at minimum: name/identifier, type, source(s), owner (or ‘orphaned’), last-active, risk score/band, and status. The BA defines the full identity record; the designer represents it in inventory rows and the detail view.

 

# **3 · Screen-by-Screen Functional Requirements**

## **3.1 · Onboarding & Connect   \[Wave 1\]**

 

 

***Data shown***

•  	A 3-step guided flow with progress indicator

•  	Connect-cloud cards for AWS, GCP, Azure, each with a connection state

•  	Trust messaging: read-only, agentless, nothing installed, nothing changed

•  	Live scan progress with a running count and a per-type breakdown (service accounts, API keys, AI agents, workload IDs) as identities are discovered

***User actions***

•  	Choose a cloud and start the connect flow

•  	Authorize read-only access via the cloud’s native mechanism

•  	Watch the live scan; proceed when first results appear

•  	Add additional clouds/sources; finish onboarding

***Business rules***

•  	Connection is read-only and agentless — no write access requested during discovery

•  	First insight target: identities visible within \~30 minutes

•  	A source can be in one of: not-connected, connecting, scanning, connected, error

***Acceptance criteria (starter set — BA to expand)***

•  	Given a Security Admin in onboarding, when they connect a cloud with valid read-only access, then a scan starts and identities begin appearing with a live count

•  	Given a connection fails, then a clear error state explains why and offers a retry

•  	Given the scan returns identities, then the per-type breakdown updates as results arrive

 

## **3.2 · Dashboard (Home)   \[Wave 1\]**

 

 

***Data shown***

•  	A total NHI count (deduplicated, for scale)

•  	Per-type KPI tiles with AI agents prominent (e.g. total NHIs, critical risk, AI agents, privilege drift), each with a delta vs prior period

•  	An identity-activity chart over time with anomalies highlighted

•  	A priority-alerts list with severity indicator, identity, and time-ago

•  	Overall health indicator

***User actions***

•  	Click a KPI tile to drill into the filtered inventory

•  	Click an alert to open its detail / the session replay

•  	Navigate to any pillar from here

***Business rules***

•  	All counts are on correlated, deduplicated identities (same identity across clouds counts once)

•  	Dashboard counts must reconcile with the Identity Inventory filters

•  	Tiles change emphasis (e.g. colour) when thresholds are crossed — thresholds Architect-confirmed

•  	Colour is reserved for risk/anomaly; calm baseline otherwise

***Acceptance criteria (starter set — BA to expand)***

•  	Given populated data, when the user views the dashboard, then total \+ per-type counts show and reconcile with inventory

•  	Given a new tenant with no data, then an empty state guides them to connect a source

•  	Given the user clicks the ‘AI agents’ tile, then the inventory opens filtered to AI agents

 

## **3.3 · Identity Inventory (Discover)   \[Wave 1\]**

 

 

***Data shown***

•  	A table of identities: name/identifier, type, source(s), last-active, risk band/score, status (incl. orphaned)

•  	Type filter pills with per-type counts (all / AI agents / service accounts / API keys / workload IDs)

•  	A critical-risk filter and an orphaned filter

•  	Correlated identity rows that expand to show each source instance and its per-source attributes

•  	Search; sort; saved views (e.g. ‘critical first’)

***User actions***

•  	Search and filter by type, risk, source, status

•  	Sort by risk or last-active

•  	Expand a row to see its sources and per-source attributes

•  	Open an identity to its detail view

•  	Save a view

***Business rules***

•  	Same NHI across clouds \= one correlated row, expandable (not multiple rows)

•  	Per-type counts reconcile with the dashboard

•  	Orphaned identities are always visible and filterable; never hidden

•  	Conflicting attributes across sources are surfaced with an indicator, not silently merged

***Acceptance criteria (starter set — BA to expand)***

•  	Given the inventory, when the user filters by type \+ risk, then only matching identities show and counts update

•  	Given a correlated identity, when expanded, then each source instance and its attributes are visible

•  	Given an attribute conflict across sources, then a conflict indicator is shown and all values are preserved

•  	Given no matches, then an empty state is shown

 

## **3.4 · Identity Detail   \[Wave 1\]**

 

 

***Data shown***

•  	Identity header: name, type, owner/orphaned, status, risk band

•  	Source instances (the correlated set) with per-source attributes and any conflicts surfaced

•  	Activity/behaviour summary and recent events

•  	Relationships / what it can reach (links to Blast Radius)

•  	Available actions (govern, rotate, assign owner) per role

***User actions***

•  	Assign or change owner

•  	Open policy / governance actions

•  	Initiate rotation (Admin)

•  	Jump to Blast Radius or, for AI agents, Session Replay

***Business rules***

•  	Shows the correlated identity, not a single-cloud slice

•  	Per-source authority respected; Acrivault-derived fields labelled as such

•  	Actions gated by role

***Acceptance criteria (starter set — BA to expand)***

•  	Given an identity, when viewed, then its correlated sources, attributes, risk, and owner are shown

•  	Given an orphaned identity, then its status is prominent and an ‘assign owner’ action is offered

•  	Given a Viewer, then action controls are hidden/disabled

 

## **3.5 · Agent Session Replay (Intelligence)   \[Wave 1\]**

 

 

***Data shown***

•  	Session header: agent identity, model, time range, step count, anomaly flag

•  	A step timeline: prompt received, tool calls, model responses, and any anomaly steps

•  	Anomaly steps highlighted distinctly

•  	A side rail: identity, provenance (what spawned it), credentials used, session risk, and actions

***User actions***

•  	Step through the session timeline

•  	Inspect a step’s detail

•  	Quarantine the agent or mark the session reviewed (role-gated)

•  	Jump to the agent’s identity detail

***Business rules***

•  	A session is attributable to one agent identity

•  	An anomaly step is visibly distinct from normal steps

•  	Actions (quarantine / mark reviewed) are role-gated and logged

***Acceptance criteria (starter set — BA to expand)***

•  	Given a flagged session, when viewed, then the anomaly step is clearly highlighted in the timeline

•  	Given an analyst, when they quarantine the agent, then the action is recorded and reflected on the identity

•  	Given a session still loading, then a loading state is shown

 

## **3.6 · Policy Builder (Govern)   \[Wave 1\]**

 

 

***Data shown***

•  	A WHEN / AND / THEN rule structure built from selectable tokens (subject, trigger, condition, action)

•  	A plain-English preview of the rule

•  	An affected-count showing how many identities the rule would hit

•  	Test vs Save & Activate controls

***User actions***

•  	Compose a rule by selecting tokens

•  	Add/remove conditions

•  	Preview the plain-English rule and affected-count

•  	Test (dry-run) the policy, then save & activate

***Business rules***

•  	The plain-English preview must accurately reflect the composed rule

•  	Test is a dry-run — it reports the affected set without enforcing

•  	Activation is explicit and role-gated

***Acceptance criteria (starter set — BA to expand)***

•  	Given a composed rule, when previewed, then the plain-English statement and affected-count match the tokens chosen

•  	Given the user tests a policy, then the affected identities are reported with no enforcement

•  	Given activation, then the policy becomes active and is recorded

 

## **3.7 · Monitor (alerts & baseline)   \[Wave 1\]**

 

 

***Data shown***

•  	An alert feed (severity, identity, type of anomaly, time)

•  	Alert detail with context and recommended next step

•  	A behavioural-baseline indicator (learning vs established)

•  	A risk timeline per identity

***User actions***

•  	Triage and filter alerts

•  	Open an alert to its detail and to the related identity/session

•  	Acknowledge / resolve an alert (role-gated)

***Business rules***

•  	Monitoring needs a baseline window before anomaly detection is at full strength — communicate ‘learning’ vs ‘established’

•  	Alerts link to the identity and, for agents, the session replay

•  	Resolution is logged

***Acceptance criteria (starter set — BA to expand)***

•  	Given an established baseline, when anomalous behaviour occurs, then an alert is raised with context

•  	Given the baseline is still learning, then the UI indicates this rather than implying full coverage

•  	Given an alert, when resolved, then it leaves the active feed and is recorded

 

## **3.8 · Rotate (credential lifecycle)   \[Wave 1\]**

 

 

***Data shown***

•  	The lifecycle/status of an identity’s credentials

•  	An emergency-rotation action

•  	A rotation history / audit trail

***User actions***

•  	Initiate a standard rotation

•  	Initiate an emergency rotation

•  	View rotation history

***Business rules***

•  	Rotation actions are Admin-only and fully logged

•  	Emergency rotation is clearly distinguished and confirmed before execution

•  	History is immutable evidence

***Acceptance criteria (starter set — BA to expand)***

•  	Given an Admin, when they initiate rotation, then the action is confirmed, executed, and recorded in history

•  	Given a non-Admin, then rotation controls are unavailable

•  	Given a completed rotation, then it appears in the history with actor and time

 

## **3.9 · Blast Radius   \[Wave 1\]**

 

 

***Data shown***

•  	A radial graph centred on the identity with reachable nodes

•  	A reach summary: direct, transitive, cascade counts

•  	An estimated-containment indicator

•  	Links to rehearse recovery (Wave 2 concept) and ask Copilot (Wave 2 concept)

***User actions***

•  	Explore the reachable graph

•  	Read the reach summary

•  	Jump to related actions

***Business rules***

•  	Reach categories (direct / transitive / cascade) are clearly distinguished

•  	Graph reflects the correlated identity’s real relationships

***Acceptance criteria (starter set — BA to expand)***

•  	Given an identity, when blast radius is opened, then direct/transitive/cascade reach are shown with a graph

•  	Given a high-reach identity, then the summary makes the scale clear

 

## **3.10 · Platform-wide (settings, SSO, audit log, notifications)   \[Wave 1\]**

 

 

***Data shown***

•  	Account & team settings; user management

•  	Sign-in / SSO configuration

•  	An immutable audit log of security-relevant actions

•  	A notifications surface

***User actions***

•  	Manage users and roles (Admin)

•  	Configure sign-in / SSO (Admin)

•  	Review and export the audit log (Auditor)

•  	Manage notification preferences

***Business rules***

•  	User sign-in supports SSO (SAML/OIDC) and/or simpler email/Google sign-in depending on stage

•  	The audit log is append-only / tamper-evident

•  	Sensitive actions (rotation, policy activation, quarantine) are audited

***Acceptance criteria (starter set — BA to expand)***

•  	Given an Admin, when they add a user with a role, then that role’s permissions apply

•  	Given any audited action, then it appears in the audit log with actor, action, and time

•  	Given SSO configured, then users authenticate via the configured provider

 

 

# **4 · Wave-2 Screens — Concept Only**

| DESIGN/SPEC TO CONCEPT ONLY; COORDINATE WITH THE ARCHITECT BEFORE DETAIL *Screens 06 (Recovery Rehearsals) and 08 (Defender Copilot) are Wave-2 capabilities. Represent the concept shown in the lookbook so the design system covers them, but do NOT produce detailed requirements or designs for their internals — those are US-team-only per the IP boundary. Recovery Rehearsals: a board-confidence view with a ‘time-to-usable’ headline metric and a rehearsals table. Defender Copilot: an advisory assistant that proposes ranked suggestions, each with a rationale and Run/Skip — it never acts autonomously; humans approve.* |
| :---- |

# **5 · How BA & Designer Use This Together**

•  	**BA:**  for each screen section, write atomic requirements (the format in the BA Playbook), expand the starter acceptance criteria, and trace each to this document and the PRD/SRS.

•  	**Designer:**  design each screen and all four states from its section, applying the brand/design system; mark Architect-owned items as assumptions to confirm.

•  	**Both:**  keep dashboard counts, inventory filters, and the identity model consistent across both of your outputs — they must reconcile.

•  	**Both:**  anything marked OPEN or Architect-owned: specify/design the surface and flag the internal decision to the TPM for the Architect. Do not invent it.

# **6 · Open Items Log (to resolve with TPM/Architect)**

| Item | Owner | Needed by |
| :---- | :---- | :---- |
| **Final role list \+ permission matrix** | BA \+ Architect | Prototype |
| **Identity record — full field list** | BA \+ Architect | Prototype |
| **Correlation/matching logic** | Architect | Inventory build |
| **Type classification logic** | Architect | Dashboard/inventory |
| **Risk-score derivation \+ thresholds** | Architect | Dashboard/monitor |
| **Cloud-connection mechanism \+ scopes** | Architect | Onboarding build |
| **Policy grammar \+ enforcement** | Architect | Policy builder |
| **SSO now vs later for design partners** | Founder \+ Architect | Settings |

 

| BOUNDARY & STATUS *This specification defines user-facing product behaviour for Wave 1\. It deliberately excludes the security-critical internals — the Identity Firewall enforcement engine, the correlation/matching and classification algorithms, risk-score derivation, rotation/cascade-revocation mechanics, and all Wave-2 internals — which are Architect-owned and US-team-only per the IP boundary. It also excludes Company financial and investor information. Treat OPEN items as questions for the TPM/Architect, not assumptions to fill in. Living document — expect refinement as the Architect confirms the open items.* |
| :---- |

   


[image1]: <data:image/png;base64,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>
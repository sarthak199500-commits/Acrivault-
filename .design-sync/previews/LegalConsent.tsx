import { useState } from 'react';
import type { ReactNode } from 'react';
import { LegalConsent } from 'acrivault';

/* LegalConsent pairs two scrollable document readers (ToS + DPA) with the two
 * required consent checkboxes. The gated primary action lives on the screen and
 * enables only when both are checked. docs is { tos, dpa } strings. */
const DOCS = {
  tos: `Acrivault Terms of Service

1. Acceptance. By creating an organization you agree to these terms on behalf of that organization.

2. Service. Acrivault provides non-human identity discovery and governance over the clouds you connect. You remain responsible for the credentials you grant.

3. Acceptable use. You will not use the service to access identities you are not authorized to govern.

4. Data. Telemetry is processed under the Data Processing Agreement.`,
  dpa: `Data Processing Agreement

1. Roles. You are the controller; Acrivault is the processor for identity metadata you submit.

2. Processing. We process metadata only to provide discovery, scoring, and governance.

3. Sub-processors. A current list is available on request; we give notice before adding any.

4. Security. Data is encrypted in transit and at rest; access is least-privilege and logged.`,
};

function Frame({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: 'var(--bg)', borderRadius: 'var(--r-md)', padding: 24, display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 460 }}>{children}</div>
    </div>
  );
}

/** Both documents with the consent checkboxes — one already ticked, one pending,
 *  the state that keeps the screen's primary action disabled. */
export function ReadAndAgree() {
  const [consents, setConsents] = useState({ tos: true, dpa: false });
  return (
    <Frame>
      <LegalConsent docs={DOCS} consents={consents} onChange={setConsents} />
    </Frame>
  );
}

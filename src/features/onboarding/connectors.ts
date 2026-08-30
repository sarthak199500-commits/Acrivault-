import type { Cloud } from '@/mocks/types';
import type { SelectOption } from '@/components/ui/Select';

/**
 * Per-cloud connector specs: what we ask for, what the customer runs in their own
 * console, and what we show back once it reports in.
 *
 * ASSUMPTION (Architect-owned): the real connector handshake — template contents,
 * granted scopes, polling transport — is not modelled here. Everything below is the
 * UI contract and seeded mock values. Nothing in this file is, or may become, a real
 * credential: the AWS external ID and the Azure client secret are both minted inside
 * the customer's own cloud and never round-trip through Acrivault.
 */

export interface TextField {
  kind: 'text';
  name: string;
  label: string;
  placeholder: string;
  hint: string;
  /** Returns an error message, or null when the value is acceptable. */
  validate: (value: string) => string | null;
}

export interface SelectField {
  kind: 'select';
  name: string;
  label: string;
  options: SelectOption[];
  defaultValue: string;
}

export type ConnectorField = TextField | SelectField;

export type FieldValues = Record<string, string>;

export interface HandoffSpec {
  /** Names where the person is going, rather than repeating the provider name. */
  title: string;
  where: string;
  steps: string[];
  cta: string;
  /** A hard failure condition that must not be buried inside a numbered step. */
  warning?: string;
  script?: string;
  /** The identifier the script asks for, echoed back so it can be copied. */
  echo?: { label: string; from: string };
  /**
   * Values the customer checks against their console *during* setup. Distinct from
   * ConnectorSpec.facts, which prove a finished connection — an STS assumed-role ARN
   * cannot be shown before the role it names has been created.
   */
  facts?: (values: FieldValues) => { label: string; value: string }[];
  /** Used verbatim in "Waiting — usually {wait}." */
  wait: string;
}

export interface ConnectorSpec {
  cloud: Cloud;
  /** Long label ("Google Cloud"). Short labels belong on the cards, not in here. */
  label: string;
  /** The unit being connected: account, subscription, project. */
  resource: string;
  fields: ConnectorField[];
  handoff: HandoffSpec;
  /** Identifiers proving the connection, shown once it reports in. */
  facts: (values: FieldValues) => { label: string; value: string }[];
  /** The single line that identifies what you are about to disconnect. */
  identity: (values: FieldValues) => string;
  /** What stays behind in the customer's cloud after disconnecting. */
  leaves: string;
}

/** Stable, obviously-synthetic suffix so demo values differ per input but never move. */
function suffix(seed: string, len = 8): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0').slice(0, len);
}

/** GUID-shaped, deterministic and obviously synthetic — never a real external ID. */
function mockGuid(seed: string): string {
  return [
    suffix(seed),
    suffix(`${seed}-1`, 4),
    suffix(`${seed}-2`, 4),
    suffix(`${seed}-3`, 4),
    `${suffix(`${seed}-4`)}${suffix(`${seed}-5`, 4)}`,
  ].join('-');
}

const AWS_REGIONS: SelectOption[] = [
  { value: 'us-east-1', label: 'us-east-1 — US East (N. Virginia)' },
  { value: 'us-west-2', label: 'us-west-2 — US West (Oregon)' },
  { value: 'eu-west-1', label: 'eu-west-1 — Europe (Ireland)' },
  { value: 'ap-south-1', label: 'ap-south-1 — Asia Pacific (Mumbai)' },
];

const GCP_REGIONS: SelectOption[] = [
  { value: 'us-central1', label: 'us-central1 — Iowa' },
  { value: 'us-east1', label: 'us-east1 — South Carolina' },
  { value: 'europe-west1', label: 'europe-west1 — Belgium' },
  { value: 'asia-south1', label: 'asia-south1 — Mumbai' },
];

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const AZURE_SCRIPT = [
  '<#',
  '  Acrivault - Azure read-only connector setup',
  '  Creates an Entra ID app registration and grants it Reader on one scope.',
  '  Read-only: no resource in the subscription is created, changed or deleted.',
  '#>',
  'param(',
  '  [Parameter(Mandatory = $true)][string]$ScopeId',
  ')',
  '',
  "$ErrorActionPreference = 'Stop'",
  '$appName = "Acrivault-Discovery"',
  '',
  'Write-Host "Creating app registration $appName..."',
  '$app = az ad app create --display-name $appName | ConvertFrom-Json',
  '$sp = az ad sp create --id $app.appId | ConvertFrom-Json',
  '',
  'Write-Host "Granting Reader on /subscriptions/$ScopeId..."',
  'az role assignment create `',
  '  --assignee $sp.id `',
  '  --role "Reader" `',
  '  --scope "/subscriptions/$ScopeId" | Out-Null',
  '',
  '# The client secret is minted here, in your own tenant, and posted straight back',
  '# to Acrivault over TLS. It is never displayed, logged or written to disk.',
  '$secret = az ad app credential reset --id $app.appId --years 1 | ConvertFrom-Json',
  '',
  'Write-Host "Reporting back to Acrivault..."',
  '$body = @{',
  '  tenantId       = $secret.tenant',
  '  clientId       = $secret.appId',
  '  clientSecret   = $secret.password',
  '  subscriptionId = $ScopeId',
  '} | ConvertTo-Json',
  '',
  "Invoke-RestMethod -Method Post -ContentType 'application/json' `",
  '  -Uri "https://connect.acrivault.com/azure/callback" -Body $body | Out-Null',
  '',
  'Write-Host "Done. Return to Acrivault - the dialog updates on its own."',
].join('\n');

const GCP_SCRIPT = [
  '#!/usr/bin/env bash',
  '# Acrivault - GCP read-only connector setup (workload identity federation)',
  '# Creates a service account with viewer-grade roles and federates it to',
  '# Acrivault. No key file is created, downloaded or stored anywhere.',
  'set -euo pipefail',
  '',
  'PROJECT_ID="${1:?usage: setup.sh <project-id>}"',
  'POOL="acrivault-pool"',
  'SA="acrivault-discovery@${PROJECT_ID}.iam.gserviceaccount.com"',
  '',
  'echo "Enabling the APIs discovery reads from..."',
  'gcloud services enable iam.googleapis.com iamcredentials.googleapis.com \\',
  '  cloudresourcemanager.googleapis.com --project "${PROJECT_ID}"',
  '',
  'echo "Creating the service account..."',
  'gcloud iam service-accounts create acrivault-discovery \\',
  '  --display-name "Acrivault discovery (read-only)" --project "${PROJECT_ID}"',
  '',
  'echo "Granting read-only roles..."',
  'for ROLE in roles/viewer roles/iam.securityReviewer; do',
  '  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \\',
  '    --member "serviceAccount:${SA}" --role "${ROLE}" --condition None >/dev/null',
  'done',
  '',
  'echo "Federating to Acrivault (no key file is issued)..."',
  'gcloud iam workload-identity-pools create "${POOL}" \\',
  '  --location global --display-name "Acrivault" --project "${PROJECT_ID}"',
  '',
  'gcloud iam workload-identity-pools providers create-oidc acrivault \\',
  '  --location global --workload-identity-pool "${POOL}" \\',
  '  --issuer-uri "https://connect.acrivault.com" \\',
  '  --attribute-mapping "google.subject=assertion.sub" \\',
  '  --project "${PROJECT_ID}"',
  '',
  'echo "Done. Return to Acrivault - the dialog updates on its own."',
].join('\n');

export const CONNECTORS: Record<Cloud, ConnectorSpec> = {
  aws: {
    cloud: 'aws',
    label: 'AWS',
    resource: 'account',
    fields: [
      {
        kind: 'text',
        name: 'account',
        label: 'Account number',
        placeholder: '123456789012',
        hint: '12 digits, no dashes.',
        validate: (v) => {
          const t = v.trim();
          if (!t) return 'Enter the account number you want to discover.';
          if (!/^\d+$/.test(t)) return 'Account numbers are digits only — no dashes or spaces.';
          if (t.length !== 12) return `Account numbers are 12 digits — that one has ${t.length}.`;
          return null;
        },
      },
      { kind: 'select', name: 'region', label: 'Region', options: AWS_REGIONS, defaultValue: 'us-east-1' },
    ],
    handoff: {
      title: 'Finish in your AWS console',
      where: 'your AWS console',
      steps: [
        'Open AWS CloudFormation — the template and its parameters are prefilled.',
        'Create the stack and wait for it to finish.',
        'Come back here — this updates on its own.',
      ],
      cta: 'Open AWS CloudFormation',
      wait: 'about 3 minutes',
      facts: (v) => {
        const account = v.account || '000000000000';
        return [
          // The IAM role the template creates, and the external ID its trust policy
          // requires — the two values worth checking against the stack parameters.
          { label: 'Role ARN', value: `arn:aws:iam::${account}:role/AcrivaultReadRole-${suffix(account)}` },
          { label: 'External ID', value: `acrivault-${mockGuid(account)}` },
        ];
      },
    },
    facts: (v) => {
      const account = v.account || '000000000000';
      return [
        { label: 'Account', value: account },
        {
          label: 'Assumed role',
          value: `arn:aws:sts::${account}:assumed-role/AcrivaultReadRole-${suffix(account)}/acrivault-connection-check`,
        },
        { label: 'Region', value: v.region || 'us-east-1' },
      ];
    },
    identity: (v) => `Account ${v.account || '000000000000'}`,
    leaves:
      'the CloudFormation stack and its role stay where they are, so you can reconnect later or delete the stack yourself',
  },

  azure: {
    cloud: 'azure',
    label: 'Azure',
    resource: 'subscription',
    fields: [
      {
        kind: 'text',
        name: 'subscription',
        label: 'Subscription ID',
        placeholder: '11111111-2222-3333-4444-555555555555',
        hint: 'The subscription whose identities to discover. Find it on the Azure portal’s Subscriptions blade.',
        validate: (v) => {
          const t = v.trim();
          if (!t) return 'Enter the subscription you want to discover.';
          if (!GUID.test(t))
            return 'That is not a subscription ID — expected a GUID like 11111111-2222-3333-4444-555555555555.';
          return null;
        },
      },
      {
        kind: 'select',
        name: 'scope',
        label: 'Grant scope',
        options: [
          { value: 'subscription', label: 'Subscription — one subscription only' },
          { value: 'management-group', label: 'Management group — every subscription beneath it' },
        ],
        defaultValue: 'subscription',
      },
      {
        kind: 'select',
        name: 'auth',
        label: 'Authentication method',
        options: [
          { value: 'secret', label: 'Client secret — Entra ID app registration' },
          { value: 'certificate', label: 'Certificate — Entra ID app registration' },
        ],
        defaultValue: 'secret',
      },
    ],
    handoff: {
      title: 'Finish in Azure Cloud Shell',
      where: 'Azure Cloud Shell',
      steps: [
        'Copy the setup script and paste it into Azure Cloud Shell.',
        'When it asks for ScopeId, paste the subscription ID below.',
        'Come back here — this updates on its own.',
      ],
      cta: 'Open Azure Cloud Shell',
      warning: 'Cloud Shell must be set to PowerShell. The script will not run in Bash.',
      script: AZURE_SCRIPT,
      echo: { label: 'Subscription ID — the script will ask for this', from: 'subscription' },
      wait: 'about 90 seconds',
    },
    facts: (v) => {
      const sub = v.subscription || '00000000-0000-0000-0000-000000000000';
      return [
        { label: 'Subscription ID', value: sub },
        { label: 'Authentication', value: v.auth === 'certificate' ? 'Certificate' : 'Client secret' },
        { label: 'Directory (tenant) ID', value: `818437a1-5008-44d7-bb45-${suffix(sub)}1308` },
        { label: 'App registration', value: 'Acrivault-Discovery' },
      ];
    },
    identity: (v) => `Subscription ${v.subscription || '00000000-0000-0000-0000-000000000000'}`,
    leaves:
      'the app registration and its client secret stay in your Entra ID tenant, so delete them there if you don’t plan to reconnect',
  },

  gcp: {
    cloud: 'gcp',
    label: 'Google Cloud',
    resource: 'project',
    fields: [
      {
        kind: 'select',
        name: 'scope',
        label: 'Grant scope',
        options: [
          { value: 'project', label: 'Project — one project only' },
          { value: 'folder', label: 'Folder — every project beneath it' },
          { value: 'organization', label: 'Organization — every project in the org' },
        ],
        defaultValue: 'project',
      },
      {
        kind: 'text',
        name: 'project',
        label: 'Project ID',
        placeholder: 'extreme-pixel-504520-v5',
        hint: 'The ID, not the display name. Lowercase, 6–30 characters.',
        validate: (v) => {
          const t = v.trim();
          if (!t) return 'Enter the project you want to discover.';
          if (t.length < 6 || t.length > 30) return `Project IDs are 6–30 characters — that one has ${t.length}.`;
          if (!/^[a-z][a-z0-9-]*[a-z0-9]$/.test(t))
            return 'Project IDs are lowercase letters, digits and hyphens, starting with a letter.';
          return null;
        },
      },
      {
        kind: 'select',
        name: 'access',
        label: 'Access method',
        options: [
          { value: 'wif', label: 'Workload identity federation' },
          { value: 'sa-key', label: 'Service account key' },
        ],
        defaultValue: 'wif',
      },
      { kind: 'select', name: 'region', label: 'Region', options: GCP_REGIONS, defaultValue: 'us-central1' },
    ],
    handoff: {
      title: 'Finish in Google Cloud Shell',
      where: 'Google Cloud Shell',
      steps: [
        'Copy the setup script and paste it into Google Cloud Shell.',
        'Come back here — this updates on its own.',
      ],
      cta: 'Open Google Cloud Shell',
      script: GCP_SCRIPT,
      echo: { label: 'Project ID — the project you’re connecting', from: 'project' },
      wait: 'about 2 minutes',
    },
    facts: (v) => {
      const project = v.project || 'unknown-project';
      return [
        { label: 'Project ID', value: project },
        { label: 'Access method', value: v.access === 'sa-key' ? 'Service account key' : 'Workload identity federation' },
        { label: 'Service account', value: `acrivault-discovery@${project}.iam.gserviceaccount.com` },
        { label: 'Region', value: v.region || 'us-central1' },
      ];
    },
    identity: (v) => `Project ${v.project || 'unknown-project'}`,
    leaves:
      'the service account and its role bindings stay where they are, so you can reconnect later or remove them yourself',
  },
};

/** Initial form values for a cloud: selects start at their default, text starts empty. */
export function initialValues(cloud: Cloud): FieldValues {
  const out: FieldValues = {};
  for (const f of CONNECTORS[cloud].fields) out[f.name] = f.kind === 'select' ? f.defaultValue : '';
  return out;
}

/** Every failing text field, keyed by field name. Selects cannot be invalid. */
export function validateFields(cloud: Cloud, values: FieldValues): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const f of CONNECTORS[cloud].fields) {
    if (f.kind !== 'text') continue;
    const err = f.validate(values[f.name] ?? '');
    if (err) errors[f.name] = err;
  }
  return errors;
}

/** Line count, so the "read it first" affordance can state a truthful number. */
export function scriptLines(script: string): number {
  return script.split('\n').length;
}

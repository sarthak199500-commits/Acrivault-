/**
 * Client-side CSV export.
 *
 * Wave 1 has no backend, so evidence files are built in the browser and handed
 * to the user through an object URL. Every export carries a provenance header,
 * because a bare table of rows says nothing about who pulled it, when, or under
 * which filter once it is sitting in an auditor's folder six weeks later — and
 * an audit export whose own provenance is unknown is not evidence.
 */

/**
 * RFC 4180 field. Quote when the value holds a comma, a quote, a CR or an LF,
 * and double any interior quote. Applied to headers as well as cells: a column
 * label is a field like any other, and an unquoted comma in one would silently
 * shift every column after it.
 */
function field(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export interface CsvManifest {
  tenant: string;
  /** Who pulled the file. An export with no named actor cannot be challenged. */
  actor: string;
  /** Already-formatted UTC instant, e.g. "2026-08-22 14:03 UTC". */
  generatedAt: string;
  /** Human-readable summary of the active filter. Omitted when unfiltered. */
  filter?: string;
  rows: number;
  /**
   * Population the rows were drawn from, stated only when the export is a
   * subset. "# rows: 247" reads as the whole tenant; "247 of 1500" cannot.
   */
  of?: number;
}

/** The `#`-prefixed provenance block that precedes the header row. */
export function manifestLines(m: CsvManifest): string[] {
  const lines = [`# tenant: ${m.tenant}`, `# generated: ${m.generatedAt} by ${m.actor}`];
  if (m.filter) lines.push(`# filter: ${m.filter}`);
  lines.push(m.of === undefined ? `# rows: ${m.rows}` : `# rows: ${m.rows} of ${m.of}`);
  return lines;
}

export function toCsv(headers: string[], rows: unknown[][], manifest?: CsvManifest): string {
  const out = manifest ? manifestLines(manifest) : [];
  out.push(headers.map(field).join(','));
  for (const row of rows) out.push(row.map(field).join(','));
  // CRLF between records, per RFC 4180. Excel and every auditor's toolchain
  // accept LF too, but only CRLF is the spec.
  return out.join('\r\n');
}

/**
 * UTC filename stamp, e.g. `2026-08-22T1403Z`. Minutes are enough to
 * disambiguate two exports; the colons ISO would put in are illegal in a
 * Windows filename and would silently break the download.
 */
export function fileStamp(at: Date): string {
  return at
    .toISOString()
    .replace(/:\d\d\.\d+Z$/, 'Z')
    .replace(/:/g, '');
}

/** UTC instant for a manifest's `generated:` line, e.g. "2026-08-22 14:03 UTC". */
export function utcStamp(at: Date): string {
  return `${at.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/**
 * Tenant line for an export manifest.
 *
 * Wave 1's data is fabricated, and a CSV outlives the console it left — nothing
 * else in the file says it is not a real inventory, so the tenant line does.
 * One definition, so the marker cannot drift between two exports.
 */
export function tenantLabel(name: string): string {
  return `${name} (synthetic)`;
}

/**
 * Hand a built file to the browser through an object URL.
 *
 * No-ops where the DOM APIs are absent, which is every test environment:
 * jsdom implements `document` but not `URL.createObjectURL`, so a call that
 * only guarded on `document` would still throw inside a component test.
 */
export function downloadFile(
  filename: string,
  contents: string,
  mime = 'text/csv;charset=utf-8',
): void {
  if (typeof document === 'undefined') return;
  if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

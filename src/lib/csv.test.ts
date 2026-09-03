import { describe, expect, it } from 'vitest';
import { fileStamp, manifestLines, tenantLabel, toCsv, utcStamp } from './csv';

describe('csv field escaping', () => {
  it('leaves a plain field alone', () => {
    expect(toCsv(['a'], [['plain']])).toBe('a\r\nplain');
  });

  it('quotes a field containing a comma, a quote, a CR, or an LF', () => {
    expect(toCsv(['a'], [['x,y']])).toContain('"x,y"');
    expect(toCsv(['a'], [['say "hi"']])).toContain('"say ""hi"""');
    expect(toCsv(['a'], [['line1\nline2']])).toContain('"line1\nline2"');
    expect(toCsv(['a'], [['line1\rline2']])).toContain('"line1\rline2"');
  });

  // A header is a field like any other: an object label could acquire a comma
  // later, and an unquoted one would silently split the column.
  it('escapes headers on the same rule as cells', () => {
    expect(toCsv(['risk, band'], [['critical']])).toBe('"risk, band"\r\ncritical');
  });

  it('renders empty for null and undefined rather than the word', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,');
  });

  it('separates records with CRLF, as RFC 4180 requires', () => {
    expect(toCsv(['a'], [['one'], ['two']])).toBe('a\r\none\r\ntwo');
  });
});

describe('csv provenance manifest', () => {
  it('writes a header a reader can act on weeks later', () => {
    const lines = manifestLines({
      tenant: 'Acme Corp (synthetic)',
      actor: 'alex.kim@acme.com',
      generatedAt: '2026-08-22 14:03 UTC',
      filter: 'band=critical',
      rows: 247,
      of: 1500,
    });
    expect(lines[0]).toBe('# tenant: Acme Corp (synthetic)');
    expect(lines[1]).toBe('# generated: 2026-08-22 14:03 UTC by alex.kim@acme.com');
    expect(lines[2]).toBe('# filter: band=critical');
    expect(lines[3]).toBe('# rows: 247 of 1500');
  });

  it('omits the filter line when the export was unfiltered', () => {
    const lines = manifestLines({ tenant: 'T', actor: 'a', generatedAt: 'g', rows: 5 });
    expect(lines.some((l) => l.startsWith('# filter:'))).toBe(false);
    expect(lines[lines.length - 1]).toBe('# rows: 5');
  });

  // "247" alone reads as the whole population. "247 of 1500" is the only form
  // that tells an auditor the file is a subset.
  it('states the population only when the export is a subset', () => {
    expect(manifestLines({ tenant: 'T', actor: 'a', generatedAt: 'g', rows: 5, of: 9 }).pop()).toBe(
      '# rows: 5 of 9',
    );
    expect(manifestLines({ tenant: 'T', actor: 'a', generatedAt: 'g', rows: 5 }).pop()).toBe(
      '# rows: 5',
    );
  });

  it('prepends the manifest above the header row', () => {
    const csv = toCsv(['a'], [['x']], {
      tenant: 'T',
      actor: 'a@b.test',
      generatedAt: 'g',
      rows: 1,
    });
    expect(csv.split('\r\n')).toEqual(['# tenant: T', '# generated: g by a@b.test', '# rows: 1', 'a', 'x']);
  });
});

describe('fileStamp', () => {
  it('stamps a UTC instant that is safe in a filename on every OS', () => {
    expect(fileStamp(new Date('2026-08-22T14:03:27.123Z'))).toBe('2026-08-22T1403Z');
  });

  it('carries no colon, which Windows forbids in a filename', () => {
    expect(fileStamp(new Date('2026-01-02T03:04:05.000Z'))).not.toContain(':');
  });
});

describe('manifest field helpers', () => {
  it('states the instant in UTC, not the reader’s local zone', () => {
    expect(utcStamp(new Date('2026-08-22T14:03:27.123Z'))).toBe('2026-08-22 14:03 UTC');
  });

  // A CSV outlives the console it left; nothing else in the file says the data
  // is fabricated.
  it('marks the tenant as synthetic', () => {
    expect(tenantLabel('Acme Corp')).toBe('Acme Corp (synthetic)');
  });
});

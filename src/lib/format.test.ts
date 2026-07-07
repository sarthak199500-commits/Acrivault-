import { describe, expect, it } from 'vitest';
import { compact, count, duration, percent, pluralize } from './format';

describe('format', () => {
  it('groups counts with separators', () => {
    expect(count(51204)).toBe('51,204');
    expect(count(0)).toBe('0');
  });

  it('compacts large numbers for tiles', () => {
    expect(compact(1200)).toBe('1.2K');
    expect(compact(3_400_000)).toBe('3.4M');
  });

  it('formats percentages', () => {
    expect(percent(0.42)).toBe('42%');
  });

  it('formats durations', () => {
    expect(duration(45_000)).toBe('45s');
    expect(duration(12 * 60_000)).toBe('12 min');
    expect(duration(125 * 60_000)).toBe('2h 5m');
  });

  describe('pluralize', () => {
    it('uses the singular for exactly 1', () => {
      expect(pluralize(1, 'identity', 'identities')).toBe('1 identity');
    });
    it('uses the plural for 0 and N', () => {
      expect(pluralize(0, 'identity', 'identities')).toBe('0 identities');
      expect(pluralize(5, 'identity', 'identities')).toBe('5 identities');
    });
    it('derives a default plural with +s when none given', () => {
      expect(pluralize(2, 'alert')).toBe('2 alerts');
      expect(pluralize(1, 'alert')).toBe('1 alert');
    });
    it('uses grouped counts', () => {
      expect(pluralize(1500, 'identity', 'identities')).toBe('1,500 identities');
    });
  });
});

import { describe, expect, it } from 'vitest';
import { riskBand, RISK_BAND_ORDER } from './risk';

describe('riskBand mapping', () => {
  it('maps scores to the five bands by threshold', () => {
    expect(riskBand(92).band).toBe('critical');
    expect(riskBand(80).band).toBe('critical');
    expect(riskBand(79).band).toBe('high');
    expect(riskBand(60).band).toBe('high');
    expect(riskBand(59).band).toBe('medium');
    expect(riskBand(40).band).toBe('medium');
    expect(riskBand(39).band).toBe('low');
    expect(riskBand(20).band).toBe('low');
    expect(riskBand(19).band).toBe('minimal');
    expect(riskBand(0).band).toBe('minimal');
  });

  it('clamps out-of-range scores', () => {
    expect(riskBand(150).band).toBe('critical');
    expect(riskBand(-5).band).toBe('minimal');
  });

  it('orders bands high-to-low', () => {
    expect(RISK_BAND_ORDER[0]).toBe('critical');
    expect(RISK_BAND_ORDER.at(-1)).toBe('minimal');
  });
});

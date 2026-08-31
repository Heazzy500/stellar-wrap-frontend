import {
  stroopsToXlm,
  xlmToStroops,
  parseStellarAmount,
  formatStellarAmount,
  isValidStellarAmount,
} from '../stellarAmounts';

describe('stellarAmounts utility', () => {
  describe('stroopsToXlm', () => {
    it('converts 1 XLM in stroops correctly', () => {
      expect(stroopsToXlm(BigInt(10_000_000))).toBe('1');
      expect(stroopsToXlm(10000000)).toBe('1');
      expect(stroopsToXlm('10000000')).toBe('1');
    });

    it('converts standard base fee (100 stroops) to 0.00001 XLM', () => {
      expect(stroopsToXlm(BigInt(100))).toBe('0.00001');
      expect(stroopsToXlm(100)).toBe('0.00001');
      expect(stroopsToXlm('100')).toBe('0.00001');
    });

    it('converts fractional amounts with full 7 decimal precision', () => {
      expect(stroopsToXlm(BigInt(1))).toBe('0.0000001');
      expect(stroopsToXlm(BigInt(12_345_678))).toBe('1.2345678');
      expect(stroopsToXlm(BigInt('100000000000'))).toBe('10000');
    });

    it('handles 0 correctly', () => {
      expect(stroopsToXlm(BigInt(0))).toBe('0');
      expect(stroopsToXlm(0)).toBe('0');
      expect(stroopsToXlm('0')).toBe('0');
    });

    it('handles negative stroops correctly', () => {
      expect(stroopsToXlm(BigInt(-100))).toBe('-0.00001');
      expect(stroopsToXlm(BigInt(-10_000_000))).toBe('-1');
    });

    it('throws on invalid stroops input', () => {
      expect(() => stroopsToXlm('invalid')).toThrow();
      expect(() => stroopsToXlm(1.5)).toThrow();
    });
  });

  describe('xlmToStroops', () => {
    it('converts whole XLM amounts to stroops', () => {
      expect(xlmToStroops('1')).toBe(BigInt(10_000_000));
      expect(xlmToStroops(1)).toBe(BigInt(10_000_000));
      expect(xlmToStroops('100')).toBe(BigInt(1_000_000_000));
    });

    it('converts standard fee 0.00001 XLM to 100 stroops', () => {
      expect(xlmToStroops('0.00001')).toBe(BigInt(100));
      expect(xlmToStroops(0.00001)).toBe(BigInt(100));
    });

    it('converts exact 7 decimal amounts without float precision loss', () => {
      expect(xlmToStroops('0.0000001')).toBe(BigInt(1));
      expect(xlmToStroops('1.2345678')).toBe(BigInt(12_345_678));
      expect(xlmToStroops('0.1')).toBe(BigInt(1_000_000));
      expect(xlmToStroops('0.01')).toBe(BigInt(100_000));
      expect(xlmToStroops('0.001')).toBe(BigInt(10_000));
    });

    it('throws when exceeding 7 decimal places', () => {
      expect(() => xlmToStroops('0.12345678')).toThrow(/maximum precision/);
    });

    it('throws on invalid amount formats', () => {
      expect(() => xlmToStroops('')).toThrow();
      expect(() => xlmToStroops('abc')).toThrow();
      expect(() => xlmToStroops('1.2.3')).toThrow();
    });
  });

  describe('parseStellarAmount', () => {
    it('parses valid XLM strings', () => {
      const res = parseStellarAmount('5.5');
      expect(res.valid).toBe(true);
      expect(res.stroops).toBe(BigInt(55_000_000));
      expect(res.xlm).toBe('5.5');
    });

    it('parses valid stroop strings', () => {
      const res = parseStellarAmount('100', 'stroops');
      expect(res.valid).toBe(true);
      expect(res.stroops).toBe(BigInt(100));
      expect(res.xlm).toBe('0.00001');
    });

    it('returns structured error for invalid amounts', () => {
      const res = parseStellarAmount('invalid');
      expect(res.valid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('formatStellarAmount', () => {
    it('formats stroops with XLM unit symbol', () => {
      expect(formatStellarAmount(BigInt(10_000_000))).toBe('1 XLM');
      expect(formatStellarAmount(BigInt(100))).toBe('0.00001 XLM');
      expect(formatStellarAmount(BigInt(12_345_678))).toBe('1.2345678 XLM');
    });

    it('formats with stroops unit', () => {
      expect(formatStellarAmount(BigInt(100), { unit: 'stroops' })).toBe('100 stroops');
      expect(formatStellarAmount(BigInt(10_000_000), { unit: 'stroops', useGrouping: true })).toBe('10,000,000 stroops');
    });

    it('formats with both units for transaction confirmation dialogs', () => {
      expect(formatStellarAmount(BigInt(100), { unit: 'both' })).toBe('0.00001 XLM (100 stroops)');
      expect(formatStellarAmount(BigInt(10_000_000), { unit: 'both' })).toBe('1 XLM (10,000,000 stroops)');
    });

    it('respects minDecimals and maxDecimals', () => {
      expect(formatStellarAmount(BigInt(10_000_000), { minDecimals: 2 })).toBe('1.00 XLM');
      expect(formatStellarAmount(BigInt(12_345_678), { maxDecimals: 4 })).toBe('1.2345 XLM');
    });
  });

  describe('isValidStellarAmount', () => {
    it('validates positive and zero Stellar amounts', () => {
      expect(isValidStellarAmount('0')).toBe(true);
      expect(isValidStellarAmount('100')).toBe(true);
      expect(isValidStellarAmount('0.00001')).toBe(true);
      expect(isValidStellarAmount('0.0000001')).toBe(true);
    });

    it('rejects invalid inputs', () => {
      expect(isValidStellarAmount('0.00000001')).toBe(false); // 8 decimals
      expect(isValidStellarAmount('-5')).toBe(false);
      expect(isValidStellarAmount('abc')).toBe(false);
      expect(isValidStellarAmount('')).toBe(false);
      expect(isValidStellarAmount('0', false)).toBe(false); // allowZero = false
    });
  });
});

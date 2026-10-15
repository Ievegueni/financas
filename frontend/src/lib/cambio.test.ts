import { describe, expect, it } from 'vitest';
import { converter, positivo, taxaImplicita } from './cambio';

describe('câmbio (igual ao backend)', () => {
  it('converte', () => {
    expect(converter('100.12345678', 'USDT', 'AOA', '925.5')).toBe('92664.26');
    expect(converter('100000', 'AOA', 'USDT', '925.5')).toBe('108.04970286');
    expect(converter('10', 'AOA', 'AOA', '925.5')).toBe('10');
    expect(converter('0.00000001', 'USDT', 'AOA', '1')).toBe('0');
  });
  it('taxa implícita', () => {
    expect(taxaImplicita('100', 'USDT', '92550')).toBe('925.5');
    expect(taxaImplicita('100000', 'AOA', '108')).toBe('925.92592593');
  });
  it('positivo', () => {
    expect(positivo('0.00')).toBe(false);
    expect(positivo(null)).toBe(false);
    expect(positivo('0.01')).toBe(true);
  });
});

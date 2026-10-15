import { describe, expect, it } from 'vitest';
import { formatValor, parseValor } from './money';

const sp = (s: string) => s.replace(/ /g, '\u00A0');

describe('formatValor', () => {
  it.each([
    ['0', '0,00'],
    ['1250.5', '1 250,50'],
    ['1250.12345678', '1 250,12345678'],
    ['1000000', '1 000 000,00'],
    ['999.10000000', '999,10'],
    ['-42.5', '-42,50'],
    ['007', '7,00'],
  ])('%s → %s', (input, out) => {
    expect(formatValor(input)).toBe(sp(out));
  });

  it('acrescenta a moeda', () => {
    expect(formatValor('10', 'USDT')).toBe(sp('10,00 USDT'));
  });
});

describe('parseValor', () => {
  it.each([
    ['1 250,50', '1250.50'],
    ['1.250,50', '1250.50'],
    ['1250.5', '1250.5'],
    ['1.250.000', '1250000'],
    ['0,12345678', '0.12345678'],
    ['00012', '12'],
    [' 15 ', '15'],
  ])('%s → %s', (input, out) => {
    expect(parseValor(input)).toBe(out);
  });

  it.each(['', 'abc', '-5', '1,2,3', '1,123456789', '1e5'])('rejeita %s', (input) => {
    expect(parseValor(input)).toBeNull();
  });

  it('respeita o máximo de decimais', () => {
    expect(parseValor('1,123', 2)).toBeNull();
  });
});

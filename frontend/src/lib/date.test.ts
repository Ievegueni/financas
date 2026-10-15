import { describe, expect, it } from 'vitest';
import { formatData, hoje } from './date';

describe('datas', () => {
  it('formata sem mudar o dia por causa do fuso', () => {
    expect(formatData('2026-10-15T00:00:00.000Z')).toBe('15/10/2026');
    expect(formatData('2026-01-01')).toBe('01/01/2026');
  });
  it('hoje em aaaa-mm-dd', () => {
    expect(hoje()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

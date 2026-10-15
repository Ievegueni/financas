import { describe, expect, it } from 'vitest';
import { intervalo } from './periodo';

const agora = new Date(2026, 2, 15); // 15/03/2026

describe('intervalo', () => {
  it('mês atual e passado (inclui fevereiro curto)', () => {
    expect(intervalo('mes', agora)).toEqual({ de: '2026-03-01', ate: '2026-03-31' });
    expect(intervalo('mesPassado', agora)).toEqual({ de: '2026-02-01', ate: '2026-02-28' });
  });
  it('mês passado em janeiro recua o ano', () => {
    expect(intervalo('mesPassado', new Date(2026, 0, 10))).toEqual({ de: '2025-12-01', ate: '2025-12-31' });
  });
  it('30 dias incluindo hoje, ano e tudo', () => {
    expect(intervalo('30dias', agora)).toEqual({ de: '2026-02-14', ate: '2026-03-15' });
    expect(intervalo('ano', agora)).toEqual({ de: '2026-01-01', ate: '2026-12-31' });
    expect(intervalo('tudo', agora)).toEqual({ de: '', ate: '' });
  });
});

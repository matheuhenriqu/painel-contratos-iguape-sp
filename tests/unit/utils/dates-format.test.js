import { describe, expect, it } from 'vitest';
import {
  calculateDaysUntil,
  isToday,
  isWithinRange,
  parseDate,
  startOfDay,
} from '../../../src/js/utils/dates.js';
import {
  capitalizeFirst,
  compactCurrency,
  formatCurrency,
  formatDate,
  formatDays,
  formatFileDate,
  formatPercent,
  formatShortUpdatedAt,
  formatUpdatedAt,
  toFiniteNumber,
} from '../../../src/js/utils/format.js';

describe('dates', () => {
  it('interpreta ISO válido e rejeita datas inválidas', () => {
    expect(parseDate('2026-02-28')?.getUTCDate()).toBe(28);
    expect(parseDate('2026-02-31')).toBeNull();
    expect(parseDate('31/02/2026')).toBeNull();
  });

  it('calcula diferença em dias nas bordas de fuso e horário de verão', () => {
    const base = parseDate('2026-10-17');
    expect(calculateDaysUntil(parseDate('2026-10-18'), base)).toBe(1);
    expect(calculateDaysUntil(parseDate('2026-10-16'), base)).toBe(-1);
    expect(isToday(parseDate('2026-10-17'), base)).toBe(true);
    expect(isWithinRange(30, 0, 30)).toBe(true);
    expect(startOfDay(new Date('2026-10-17T23:30:00-03:00')).getUTCHours()).toBe(0);
  });
});

describe('format', () => {
  it('formata moeda, datas, percentuais e textos curtos', () => {
    expect(formatCurrency(1234)).toBe('R$ 1.234');
    expect(compactCurrency(2_500_000)).toBe('R$ 2,5 mi');
    expect(formatDate(parseDate('2026-04-29'))).toBe('29/04/2026');
    expect(formatDays(-2)).toBe('vencido há 2 dias');
    expect(formatDays(0)).toBe('vence hoje');
    expect(formatPercent(1, 4)).toBe('25%');
    expect(formatFileDate(new Date(2026, 3, 29))).toBe('2026-04-29');
    expect(capitalizeFirst('abril')).toBe('Abril');
  });

  it('lida com valores ausentes e datas inválidas', () => {
    expect(toFiniteNumber('')).toBeNull();
    expect(toFiniteNumber('123')).toBe(123);
    expect(formatUpdatedAt('data inválida')).toBe('Sem data');
    expect(formatShortUpdatedAt('')).toBe('Sem data');
  });
});

import { describe, expect, it } from 'vitest';
import { classifyContract } from '../../../src/js/data/classify.js';
import { parseDate } from '../../../src/js/utils/dates.js';
import { makeSourceRecord } from '../helpers/records.js';

describe('classifyContract', () => {
  it.each([
    ['Finalizado', '2026-12-31', 120, 'Concluído'],
    ['Encerrado', '2026-12-31', 120, 'Encerrado'],
    ['Indefinido', '2026-12-31', 120, 'Sem informação suficiente'],
    ['Ativo', null, null, 'Sem data de vencimento'],
    ['Ativo', '2026-01-30', -1, 'Vencido'],
    ['Ativo', '2026-01-31', 0, 'Vence hoje'],
    ['Ativo', '2026-02-04', 4, 'Próximo de vencer'],
    ['Ativo', '2026-02-20', 20, 'Vence em até 30 dias'],
    ['Ativo', '2026-03-20', 48, 'Vence entre 31 e 90 dias'],
    ['Ativo', '2026-06-01', 121, 'Vigente'],
  ])('classifica %s/%s/%s como %s', (status, dateText, days, expectedLabel) => {
    const result = classifyContract(
      makeSourceRecord({ status }),
      dateText ? parseDate(dateText) : null,
      days,
    );

    expect(result.label).toBe(expectedLabel);
    expect(result.key).toBeTruthy();
    expect(result.group).toMatch(/current|expired|closed/);
  });
});

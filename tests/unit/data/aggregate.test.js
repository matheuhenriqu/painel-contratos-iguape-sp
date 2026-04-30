import { describe, expect, it } from 'vitest';
import {
  buildDashboardMetrics,
  countBy,
  getDataQualityMetrics,
  getDeadlineDistribution,
  getDueMonthData,
  getQualityAlerts,
  sum,
  sumBy,
} from '../../../src/js/data/aggregate.js';
import { formatPercent } from '../../../src/js/utils/format.js';
import { makeNormalizedRows, makeSourceRecord } from '../helpers/records.js';

describe('aggregate', () => {
  const rows = makeNormalizedRows(
    [
      makeSourceRecord({
        id: 1,
        valor: 100,
        dataVencimento: '2026-01-30',
        empresa: 'B',
        fiscal: '',
      }),
      makeSourceRecord({
        id: 2,
        valor: 300,
        dataVencimento: '2026-02-01',
        empresa: 'A',
        gestor: '',
      }),
      makeSourceRecord({ id: 3, valor: 0, dataVencimento: null, empresa: '', status: 'Ativo' }),
      makeSourceRecord({ id: 4, valor: 500, dataVencimento: '2026-05-20', status: 'Finalizado' }),
    ],
    '2026-01-31',
  );

  it('calcula KPIs e qualidade cadastral', () => {
    const currentRows = rows.filter((item) => item.businessStatus.group === 'current');
    const expiredRows = rows.filter((item) => item.businessStatus.group === 'expired');
    const completedRows = rows.filter((item) => item.businessStatus.group === 'closed');
    const metrics = buildDashboardMetrics(rows, currentRows, expiredRows, completedRows, rows, {
      generatedAt: '2026-04-29T12:00:00',
    });

    expect(metrics.filteredContracts).toBe(4);
    expect(metrics.filteredValue).toBe(900);
    expect(metrics.expiredCount).toBe(1);
    expect(metrics.closedCount).toBe(1);
    expect(metrics.withoutManager).toBe(1);
    expect(metrics.withoutFiscal).toBe(1);
    expect(metrics.withoutValue).toBe(1);
  });

  it('agrega meses, prazos, contagens e somas', () => {
    expect(getDueMonthData(rows).map((item) => item.key)).toEqual([
      '2026-01',
      '2026-02',
      '2026-05',
    ]);
    expect(getDeadlineDistribution(rows).map((item) => item.key)).toContain('vencido');
    expect(sum(rows, 'valor')).toBe(900);
    expect(countBy(rows, (item) => item.display.empresa).labels).toContain('Empresa Iguape');
    expect(
      sumBy(
        rows,
        (item) => item.display.empresa,
        (item) => item.valor,
      ).find((item) => item.label === 'Empresa Iguape').value,
    ).toBe(500);
  });

  it('gera alertas de qualidade ordenados', () => {
    const quality = getDataQualityMetrics(rows);
    const alerts = getQualityAlerts({ filteredContracts: rows.length, quality }, formatPercent);

    expect(quality.incompleteCount).toBeGreaterThan(0);
    expect(alerts[0].text).toContain('pendência cadastral');
  });
});

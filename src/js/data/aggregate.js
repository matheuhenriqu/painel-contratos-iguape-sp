import { QUALITY_FIELDS } from '../constants.js';
import { hasMissingContractValue } from './normalize.js';
import {
  capitalizeFirst,
  getPercent,
  monthFormat,
  numberFormat,
  toFiniteNumber,
} from '../utils/format.js';

export function buildDashboardMetrics(
  rows,
  currentRows,
  expiredRows,
  completedRows,
  records,
  sourceData,
) {
  const quality = getDataQualityMetrics(rows);
  const due30 = rows.filter(
    (item) =>
      !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 30,
  ).length;
  const due90 = rows.filter(
    (item) =>
      !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 90,
  ).length;
  const nearDue = rows.filter(
    (item) =>
      item.businessStatus.key === 'vence-hoje' || item.businessStatus.key === 'proximo-de-vencer',
  ).length;

  return {
    rows,
    totalContracts: records.length,
    filteredContracts: rows.length,
    totalValue: sum(records, 'valor'),
    filteredValue: sum(rows, 'valor'),
    currentCount: currentRows.length,
    expiredCount: expiredRows.length,
    closedCount: completedRows.length,
    vigenteCount: rows.filter((item) => item.businessStatus.key === 'vigente').length,
    nearDue,
    due30,
    due90,
    withoutManager: quality.counts.gestor,
    withoutFiscal: quality.counts.fiscal,
    withoutDueDate: quality.counts.dataVencimento,
    withoutValue: quality.counts.valor,
    withoutCompany: quality.counts.empresa,
    updatedAt: sourceData.updatedAt || sourceData.generatedAt,
    quality,
  };
}

export function getDataQualityMetrics(rows) {
  const counts = {
    gestor: rows.filter((item) => item.display.isMissing.gestor).length,
    fiscal: rows.filter((item) => item.display.isMissing.fiscal).length,
    dataVencimento: rows.filter((item) => item.display.isMissing.dataVencimento).length,
    valor: rows.filter(hasMissingContractValue).length,
    empresa: rows.filter((item) => item.display.isMissing.empresa).length,
  };
  const incompleteCount = rows.filter(hasIncompleteRegistration).length;
  const percentages = Object.fromEntries(
    Object.entries(counts).map(([key, value]) => [key, getPercent(value, rows.length)]),
  );

  return {
    total: rows.length,
    counts,
    percentages,
    incompleteCount,
    incompletePercent: getPercent(incompleteCount, rows.length),
  };
}

export function hasIncompleteRegistration(item) {
  return (
    item.display.isMissing.contrato ||
    item.display.isMissing.processo ||
    item.display.isMissing.objeto ||
    item.display.isMissing.empresa ||
    item.display.isMissing.modalidade ||
    item.display.isMissing.gestor ||
    item.display.isMissing.fiscal ||
    item.display.isMissing.dataVencimento ||
    hasMissingContractValue(item)
  );
}

export function getQualityAlerts(metrics, formatPercent) {
  if (!metrics.filteredContracts) {
    return [
      {
        tone: 'neutral',
        icon: 'info',
        text: 'Nenhum contrato encontrado no recorte atual para avaliar qualidade cadastral.',
      },
    ];
  }

  const alerts = QUALITY_FIELDS.map((field) => ({
    tone: metrics.quality.counts[field.key] ? 'warning' : 'ok',
    icon: metrics.quality.counts[field.key] ? 'triangle-alert' : 'circle-check',
    text: metrics.quality.counts[field.key]
      ? `${numberFormat.format(metrics.quality.counts[field.key])} contrato(s) com ${field.issue} (${formatPercent(metrics.quality.counts[field.key], metrics.filteredContracts)}).`
      : `Nenhum contrato com ${field.issue} no recorte atual.`,
    count: metrics.quality.counts[field.key],
  }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (metrics.quality.incompleteCount > 0) {
    alerts.unshift({
      tone: 'warning',
      icon: 'clipboard-x',
      text: `${numberFormat.format(metrics.quality.incompleteCount)} registro(s) com pelo menos uma pendência cadastral no recorte atual.`,
      count: metrics.quality.incompleteCount,
    });
  }

  return alerts;
}

export function getDueMonthData(rows) {
  const map = new Map();
  rows.forEach((item) => {
    if (!item.dataVencimentoDate) return;
    const key = `${item.dataVencimentoDate.getUTCFullYear()}-${String(item.dataVencimentoDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const label = capitalizeFirst(monthFormat.format(item.dataVencimentoDate).replace('.', ''));
    const current = map.get(key) || { key, label, value: 0 };
    current.value += 1;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(0, 12);
}

export function getDeadlineDistribution(rows) {
  const buckets = [
    { key: 'vencido', label: 'Vencidos', color: '#b7443e' },
    { key: 'hoje', label: 'Vence hoje', color: '#d35f1f' },
    { key: '30', label: 'Até 30 dias', color: '#bd7619' },
    { key: '90', label: '31 a 90 dias', color: '#2f6f9f' },
    { key: 'futuro', label: 'Mais de 90 dias', color: '#24715d' },
    { key: 'sem-data', label: 'Sem vencimento', color: '#70578e' },
  ];
  return buckets
    .map((bucket) => ({
      ...bucket,
      value: rows.filter((item) => item.businessStatus.prazoBucket === bucket.key).length,
    }))
    .filter((item) => item.value > 0);
}

export function sum(rows, key) {
  return rows.reduce((total, item) => total + (toFiniteNumber(item[key]) || 0), 0);
}

export function countBy(rows, accessor) {
  const map = new Map();
  rows.forEach((item) => {
    const label = accessor(item) || 'Sem informação';
    map.set(label, (map.get(label) || 0) + 1);
  });
  const entries = [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'),
  );
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, value]) => value),
  };
}

export function sumBy(rows, labelAccessor, valueAccessor) {
  const map = new Map();
  rows.forEach((item) => {
    const label = labelAccessor(item) || 'Sem informação';
    map.set(label, (map.get(label) || 0) + (toFiniteNumber(valueAccessor(item)) || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

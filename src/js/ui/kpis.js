import { FIELD_FALLBACKS, SELECT_ALL } from '../constants.js';
import { sum } from '../data/aggregate.js';
import { escapeAttr, escapeHtml, setSafeHtml } from '../utils/dom.js';
import {
  compactCurrency,
  formatCurrency,
  formatDate,
  formatDays,
  formatPercent,
  formatShortUpdatedAt,
  numberFormat,
  toFiniteNumber,
} from '../utils/format.js';
import { icon } from '../utils/icons.js';
import { applyFilterPatch, clearAllFilters } from './filters.js';
import { sortByDueDateAsc } from './table.js';

export function setupKpiEvents(context) {
  context.elements.kpiGrid.addEventListener('click', (event) => {
    const button = event.target.closest('[data-kpi-filter]');
    if (!button) return;
    applyKpiFilter(context, button.dataset.kpiFilter);
  });
}

export function renderKpis({ elements }, metrics) {
  const cards = [
    {
      label: 'Total de contratos',
      value: numberFormat.format(metrics.filteredContracts),
      note: `${numberFormat.format(metrics.totalContracts)} na base`,
      icon: 'file-text',
      color: 'green',
      filter: 'todos',
    },
    {
      label: 'Valor da base',
      value: compactCurrency(metrics.totalValue),
      note: formatCurrency(metrics.totalValue),
      icon: 'landmark',
      color: 'teal',
      filter: 'todos',
    },
    {
      label: 'Valor filtrado',
      value: compactCurrency(metrics.filteredValue),
      note: formatCurrency(metrics.filteredValue),
      icon: 'wallet',
      color: 'teal',
      filter: 'todos',
    },
    {
      label: 'Vigentes',
      value: numberFormat.format(metrics.vigenteCount),
      note: 'prazo acima de 90 dias',
      icon: 'check-circle-2',
      color: 'green',
      filter: 'vigentes',
    },
    {
      label: 'Vencidos',
      value: numberFormat.format(metrics.expiredCount),
      note: 'prazo expirado e aberto',
      icon: 'circle-alert',
      color: 'red',
      filter: 'vencidos',
    },
    {
      label: 'Próx. vencer',
      value: numberFormat.format(metrics.nearDue),
      note: 'vence hoje ou em até 7 dias',
      icon: 'alarm-clock',
      color: 'amber',
      filter: 'criticos',
    },
    {
      label: 'Até 30 dias',
      value: numberFormat.format(metrics.due30),
      note: 'contratos abertos',
      icon: 'clock-3',
      color: 'amber',
      filter: '30',
    },
    {
      label: 'Até 90 dias',
      value: numberFormat.format(metrics.due90),
      note: 'inclui vencimentos até 30 dias',
      icon: 'calendar-clock',
      color: 'plum',
      filter: '90',
    },
    {
      label: 'Sem gestor',
      value: numberFormat.format(metrics.withoutManager),
      note: formatPercent(metrics.withoutManager, metrics.filteredContracts),
      icon: 'user-round-x',
      color: 'red',
      filter: 'sem-gestor',
    },
    {
      label: 'Sem fiscal',
      value: numberFormat.format(metrics.withoutFiscal),
      note: formatPercent(metrics.withoutFiscal, metrics.filteredContracts),
      icon: 'badge-alert',
      color: 'red',
      filter: 'sem-fiscal',
    },
    {
      label: 'Sem vencimento',
      value: numberFormat.format(metrics.withoutDueDate),
      note: formatPercent(metrics.withoutDueDate, metrics.filteredContracts),
      icon: 'calendar-x',
      color: 'amber',
      filter: 'sem-vencimento',
    },
    {
      label: 'Sem valor',
      value: numberFormat.format(metrics.withoutValue),
      note: 'ausente ou zerado',
      icon: 'badge-dollar-sign',
      color: 'amber',
      filter: 'sem-valor',
    },
    {
      label: 'Sem empresa',
      value: numberFormat.format(metrics.withoutCompany),
      note: formatPercent(metrics.withoutCompany, metrics.filteredContracts),
      icon: 'building-2',
      color: 'plum',
      filter: 'sem-empresa',
    },
    {
      label: 'Encerr./concl.',
      value: numberFormat.format(metrics.closedCount),
      note: 'não entram como vencidos',
      icon: 'archive',
      color: 'plum',
      filter: 'fechados',
    },
    {
      label: 'Atualização',
      value: formatShortUpdatedAt(metrics.updatedAt),
      note: `${numberFormat.format(metrics.filteredContracts)} no recorte`,
      icon: 'database',
      color: 'green',
      filter: 'todos',
    },
  ];
  const cardsWithSeries = cards.map((card) => ({
    ...card,
    series: buildMonthlySparkline(
      metrics.rows,
      getSparklinePredicate(card.filter),
      card.label.startsWith('Valor') ? 'value' : 'count',
    ),
  }));

  setSafeHtml(
    elements.kpiGrid,
    cardsWithSeries
      .map(
        (card) => `
    <button class="kpi-card" type="button" data-kpi-filter="${escapeAttr(card.filter)}" aria-label="${escapeAttr(`${card.label}: ${card.value}. ${card.note}. Filtrar por ${card.label}.`)}">
      <span class="kpi-icon ${escapeAttr(card.color)}" aria-hidden="true">${icon(card.icon)}</span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small>${escapeHtml(card.note)}</small>
        ${renderSparkline(card.series)}
      </div>
    </button>
  `,
      )
      .join(''),
  );
}

function getSparklinePredicate(filter) {
  const predicates = {
    todos: () => true,
    vigentes: (item) => item.businessStatus.key === 'vigente',
    vencidos: (item) => item.businessStatus.key === 'vencido',
    criticos: (item) =>
      item.businessStatus.key === 'vence-hoje' || item.businessStatus.key === 'proximo-de-vencer',
    30: (item) =>
      !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 30,
    90: (item) =>
      !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 90,
    'sem-gestor': (item) => item.display.isMissing.gestor,
    'sem-fiscal': (item) => item.display.isMissing.fiscal,
    'sem-vencimento': (item) => item.display.isMissing.dataVencimento,
    'sem-valor': (item) => item.display.isMissing.valor,
    'sem-empresa': (item) => item.display.isMissing.empresa,
    fechados: (item) => item.isClosed,
  };
  return predicates[filter] || predicates.todos;
}

function buildMonthlySparkline(rows, predicate, mode) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(now.getFullYear(), now.getMonth() - 11 + index, 1));
    return {
      key: `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`,
      value: 0,
    };
  });
  const indexByKey = new Map(months.map((item, index) => [item.key, index]));

  rows.forEach((item) => {
    if (!item.dataInicioDate || !predicate(item)) return;
    const key = `${item.dataInicioDate.getUTCFullYear()}-${String(item.dataInicioDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const index = indexByKey.get(key);
    if (index === undefined) return;
    months[index].value += mode === 'value' ? toFiniteNumber(item.valor) || 0 : 1;
  });

  return months.map((item) => item.value);
}

function renderSparkline(series) {
  const width = 118;
  const height = 28;
  const max = Math.max(1, ...series);
  const points = series
    .map((value, index) => {
      const x = (index / Math.max(1, series.length - 1)) * width;
      const y = height - (value / max) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = series.at(-1) || 0;
  const lastY = height - (last / max) * (height - 4) - 2;
  return `
    <svg class="kpi-sparkline" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" aria-hidden="true" focusable="false">
      <polyline points="${escapeAttr(points)}"></polyline>
      <circle cx="${width}" cy="${lastY.toFixed(1)}" r="2.6"></circle>
    </svg>
  `;
}

export function renderInsights({ elements }, rows, metrics) {
  const openRows = rows.filter((item) => !item.isClosed);
  const nextDue = sortByDueDateAsc(
    openRows.filter(
      (item) => item.dataVencimentoDate && item.diasAtual !== null && item.diasAtual >= 0,
    ),
  )[0];
  const highestValue = [...rows].sort(
    (a, b) => (toFiniteNumber(b.valor) || 0) - (toFiniteNumber(a.valor) || 0),
  )[0];
  const missingResponsibles = rows.filter(
    (item) => item.display.isMissing.gestor || item.display.isMissing.fiscal,
  );
  const expiredRows = rows.filter((item) => item.businessStatus.key === 'vencido');
  const expiredValue = sum(expiredRows, 'valor');

  const cards = [
    {
      label: 'Próximo vencimento',
      value: nextDue ? formatDate(nextDue.dataVencimentoDate) : FIELD_FALLBACKS.dataVencimento,
      note: nextDue
        ? `${nextDue.display.objeto} · ${formatDays(nextDue.diasAtual)}`
        : 'Nenhum contrato aberto no recorte',
      icon: 'calendar-clock',
      tone: 'amber',
    },
    {
      label: 'Maior contrato',
      value: highestValue ? compactCurrency(highestValue.valor) : 'R$ 0',
      note: highestValue
        ? `${highestValue.display.objeto} · ${highestValue.display.empresa}`
        : 'Sem contratos no recorte',
      icon: 'badge-dollar-sign',
      tone: 'blue',
    },
    {
      label: 'Sem gestor/fiscal',
      value: numberFormat.format(missingResponsibles.length),
      note: `${formatPercent(missingResponsibles.length, metrics.filteredContracts)} do recorte atual`,
      icon: 'user-round-x',
      tone: 'plum',
    },
    {
      label: 'Valor vencido',
      value: compactCurrency(expiredValue),
      note: `${numberFormat.format(expiredRows.length)} contrato(s) não encerrado(s)`,
      icon: 'shield-alert',
      tone: 'red',
    },
  ];

  setSafeHtml(
    elements.insightGrid,
    cards
      .map(
        (card) => `
    <article class="insight-card ${escapeAttr(card.tone)}">
      <span class="insight-icon" aria-hidden="true">${icon(card.icon)}</span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small title="${escapeAttr(card.note)}">${escapeHtml(card.note)}</small>
      </div>
    </article>
  `,
      )
      .join(''),
  );
}

function applyKpiFilter(context, filter) {
  const common = {
    status: SELECT_ALL,
    modalidade: SELECT_ALL,
    gestor: SELECT_ALL,
    fiscal: SELECT_ALL,
    prazo: SELECT_ALL,
    ano: SELECT_ALL,
  };

  if (filter === 'todos') {
    clearAllFilters(context, { focusFirstRow: true });
    return;
  }

  const patches = {
    vigentes: { ...common, status: 'Vigente', search: '' },
    vencidos: { ...common, prazo: 'vencido', search: '' },
    criticos: { ...common, prazo: 'critico', search: '' },
    30: { ...common, prazo: '30', search: '' },
    90: { ...common, prazo: '90', search: '' },
    fechados: { ...common, search: 'status:fechado' },
    'sem-gestor': { ...common, search: 'gestor:"Sem gestor informado"' },
    'sem-fiscal': { ...common, search: 'fiscal:"Sem fiscal informado"' },
    'sem-vencimento': { ...common, prazo: 'sem-data', search: '' },
    'sem-valor': { ...common, search: 'valor:<=0' },
    'sem-empresa': { ...common, search: 'empresa:"Sem empresa informada"' },
  };

  const patch = patches[filter];
  if (patch) applyFilterPatch(context, patch, { rawSearch: patch.search, focusFirstRow: true });
}

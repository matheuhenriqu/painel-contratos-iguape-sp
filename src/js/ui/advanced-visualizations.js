import { SELECT_ALL } from '../constants.js';
import { sumBy } from '../data/aggregate.js';
import { escapeAttr, escapeHtml, setSafeHtml } from '../utils/dom.js';
import {
  compactCurrency,
  formatDate,
  formatDays,
  formatPercent,
  numberFormat,
  toFiniteNumber,
} from '../utils/format.js';
import {
  exportSvgAsPng,
  formatSvgCurrency,
  getSvgTokens,
  heatmapColor,
  monthKeyFromDate,
  monthLabelFromKey,
  renderAccessibleTable,
  shortSvgLabel,
  statusColor,
  svgMarkup,
  svgTitle,
} from '../utils/svg.js';
import { applyFilterPatch } from './filters.js';
import { sortRows } from './table.js';

const TIMELINE_PAGE_SIZE = 50;
const TREEMAP_LIMIT = 18;
const COMPARISON_LIMIT = 10;
const MONTH_LABELS = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
];

const advancedState = {
  timelinePage: 0,
  comparisonSort: 'value',
};

export function setupAdvancedVisualizations(context) {
  const { elements } = context;

  elements.timelinePrevBtn.addEventListener('click', () => {
    advancedState.timelinePage = Math.max(0, advancedState.timelinePage - 1);
    renderAdvancedVisualizations(
      context,
      context.viewState.filteredRows,
      context.viewState.metrics,
    );
  });

  elements.timelineNextBtn.addEventListener('click', () => {
    advancedState.timelinePage += 1;
    renderAdvancedVisualizations(
      context,
      context.viewState.filteredRows,
      context.viewState.metrics,
    );
  });

  elements.heatmapSvg.addEventListener('click', (event) => handleSvgFilter(context, event));
  elements.heatmapSvg.addEventListener('keydown', (event) => handleSvgFilter(context, event));
  elements.companyTreemapSvg.addEventListener('click', (event) => handleSvgFilter(context, event));
  elements.companyTreemapSvg.addEventListener('keydown', (event) =>
    handleSvgFilter(context, event),
  );

  elements.comparisonSortButtons.forEach((button) => {
    button.addEventListener('click', () => {
      advancedState.comparisonSort = button.dataset.comparisonSort;
      renderAdvancedVisualizations(
        context,
        context.viewState.filteredRows,
        context.viewState.metrics,
      );
    });
  });

  elements.timelineExportBtn.addEventListener('click', () =>
    exportSvgAsPng(elements.timelineSvg, 'linha-do-tempo-contratos.png', elements),
  );
  elements.heatmapExportBtn.addEventListener('click', () =>
    exportSvgAsPng(elements.heatmapSvg, 'heatmap-vencimentos.png', elements),
  );
  elements.treemapExportBtn.addEventListener('click', () =>
    exportSvgAsPng(elements.companyTreemapSvg, 'treemap-empresas.png', elements),
  );
  elements.comparisonExportBtn.addEventListener('click', () =>
    exportSvgAsPng(elements.comparisonSvg, 'comparativo-gestor-fiscal.png', elements),
  );
}

export function renderAdvancedVisualizations(context, rows) {
  const sortedRows = sortRows(rows, context.state);
  renderTimeline(context, sortedRows);
  renderHeatmap(context, rows);
  renderTreemap(context, rows);
  renderComparison(context, rows);
}

function renderTimeline({ elements }, rows) {
  const tokens = getSvgTokens();
  const datedRows = rows.filter((item) => item.dataInicioDate && item.dataVencimentoDate);
  const pageCount = Math.max(1, Math.ceil(datedRows.length / TIMELINE_PAGE_SIZE));
  advancedState.timelinePage = Math.min(advancedState.timelinePage, pageCount - 1);
  const pageStart = advancedState.timelinePage * TIMELINE_PAGE_SIZE;
  const visibleRows = datedRows.slice(pageStart, pageStart + TIMELINE_PAGE_SIZE);

  elements.timelineHint.textContent = `${numberFormat.format(datedRows.length)} contrato(s) com início e vencimento no recorte atual.`;
  elements.timelinePageLabel.textContent = `Página ${numberFormat.format(advancedState.timelinePage + 1)} de ${numberFormat.format(pageCount)}`;
  elements.timelinePrevBtn.disabled = advancedState.timelinePage === 0;
  elements.timelineNextBtn.disabled = advancedState.timelinePage >= pageCount - 1;

  if (!visibleRows.length) {
    renderEmptySvg(
      elements.timelineSvg,
      'Nenhum contrato com início e vencimento para montar a linha do tempo.',
    );
    setSafeHtml(
      elements.timelineTable,
      renderAccessibleTable('Linha do tempo dos contratos', ['Contrato'], [['Sem dados']]),
    );
    return;
  }

  const minTime = Math.min(...visibleRows.map((item) => item.dataInicioDate.getTime()));
  const maxTime = Math.max(...visibleRows.map((item) => item.dataVencimentoDate.getTime()));
  const span = Math.max(1, maxTime - minTime);
  const width = 1040;
  const rowHeight = 30;
  const top = 48;
  const left = 230;
  const right = 24;
  const chartWidth = width - left - right;
  const height = Math.max(320, top + visibleRows.length * rowHeight + 40);
  const scaleX = (date) => left + ((date.getTime() - minTime) / span) * chartWidth;
  const ticks = buildTimelineTicks(minTime, maxTime, 5);

  const grid = ticks
    .map((tick) => {
      const x = scaleX(tick.date);
      return [
        svgMarkup('line', { x1: x, x2: x, y1: 28, y2: height - 28, class: 'grid-line' }),
        svgMarkup(
          'text',
          { x, y: 20, 'text-anchor': 'middle', class: 'muted-label' },
          escapeHtml(tick.label),
        ),
      ].join('');
    })
    .join('');

  const bars = visibleRows
    .map((item, index) => {
      const y = top + index * rowHeight;
      const x = scaleX(item.dataInicioDate);
      const barWidth = Math.max(5, scaleX(item.dataVencimentoDate) - x);
      const label = `${item.display.contrato} - ${item.display.empresa}`;
      const description = `${label}. ${formatDate(item.dataInicioDate)} a ${formatDate(item.dataVencimentoDate)}. Status: ${item.businessStatus.label}.`;
      return svgMarkup(
        'g',
        { role: 'img', tabindex: '0', 'aria-label': description },
        [
          svgTitle(description),
          svgMarkup('text', { x: 16, y: y + 16 }, escapeHtml(shortSvgLabel(label, 34))),
          svgMarkup('rect', {
            x,
            y: y + 3,
            width: barWidth,
            height: 18,
            rx: 6,
            fill: statusColor(item.businessStatus, tokens),
          }),
          svgMarkup(
            'text',
            { x: Math.min(width - 12, x + barWidth + 8), y: y + 17, class: 'muted-label' },
            escapeHtml(item.businessStatus.label),
          ),
        ].join(''),
      );
    })
    .join('');

  setSvg(elements.timelineSvg, width, height, `${grid}${bars}`);
  setSafeHtml(
    elements.timelineTable,
    renderAccessibleTable(
      'Linha do tempo dos contratos',
      ['Contrato', 'Empresa', 'Início', 'Vencimento', 'Status'],
      visibleRows.map((item) => [
        item.display.contrato,
        item.display.empresa,
        formatDate(item.dataInicioDate),
        formatDate(item.dataVencimentoDate),
        item.businessStatus.label,
      ]),
    ),
  );
}

function renderHeatmap({ elements }, rows) {
  const tokens = getSvgTokens();
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  const counts = new Map();
  rows.forEach((item) => {
    const key = monthKeyFromDate(item.dataVencimentoDate);
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  });

  const max = Math.max(0, ...counts.values());
  const width = 940;
  const height = 320;
  const left = 86;
  const top = 54;
  const cellWidth = 64;
  const cellHeight = 32;

  const monthHeaders = MONTH_LABELS.map((label, monthIndex) =>
    svgMarkup(
      'text',
      {
        x: left + monthIndex * cellWidth + cellWidth / 2,
        y: 28,
        'text-anchor': 'middle',
        class: 'muted-label',
      },
      label,
    ),
  ).join('');

  const yearRows = years
    .map((year, yearIndex) => {
      const y = top + yearIndex * cellHeight;
      const yearLabel = svgMarkup('text', { x: 18, y: y + 21, class: 'muted-label' }, year);
      const cells = MONTH_LABELS.map((_, monthIndex) => {
        const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
        const value = counts.get(key) || 0;
        const x = left + monthIndex * cellWidth;
        const label = `${monthLabelFromKey(key)}: ${numberFormat.format(value)} vencimento(s). Clique para filtrar.`;
        return svgMarkup(
          'g',
          { role: 'button', tabindex: '0', 'data-heatmap-month': key, 'aria-label': label },
          [
            svgTitle(label),
            svgMarkup('rect', {
              x,
              y,
              width: cellWidth - 6,
              height: cellHeight - 6,
              rx: 6,
              fill: heatmapColor(value, max, tokens),
              stroke: tokens.border,
            }),
            svgMarkup(
              'text',
              { x: x + (cellWidth - 6) / 2, y: y + 19, 'text-anchor': 'middle' },
              value ? numberFormat.format(value) : '',
            ),
          ].join(''),
        );
      }).join('');
      return yearLabel + cells;
    })
    .join('');

  setSvg(elements.heatmapSvg, width, height, `${monthHeaders}${yearRows}`);
  setSafeHtml(
    elements.heatmapTable,
    renderAccessibleTable(
      'Heatmap de vencimentos por mês e ano',
      ['Ano', ...MONTH_LABELS],
      years.map((year) => [
        year,
        ...MONTH_LABELS.map((_, monthIndex) =>
          numberFormat.format(
            counts.get(`${year}-${String(monthIndex + 1).padStart(2, '0')}`) || 0,
          ),
        ),
      ]),
    ),
  );
}

function renderTreemap({ elements }, rows) {
  const tokens = getSvgTokens();
  const data = sumBy(
    rows,
    (item) => item.display.empresa,
    (item) => item.valor,
  )
    .filter((item) => item.value > 0)
    .slice(0, TREEMAP_LIMIT);

  if (!data.length) {
    renderEmptySvg(elements.companyTreemapSvg, 'Sem valores por empresa no recorte atual.');
    setSafeHtml(
      elements.companyTreemapTable,
      renderAccessibleTable('Treemap de empresas por valor', ['Empresa'], [['Sem dados']]),
    );
    return;
  }

  const width = 940;
  const height = 330;
  const rects = squarify(data, { x: 12, y: 12, width: width - 24, height: height - 24 });
  const max = Math.max(...data.map((item) => item.value));
  const shapes = rects
    .map((rect, index) => {
      const item = rect.item;
      const intensity = Math.max(0.3, Math.min(1, item.value / max));
      const fill = index % 3 === 0 ? tokens.brand : index % 3 === 1 ? tokens.info : tokens.plum;
      const label = `${item.label}: ${formatSvgCurrency(item.value)}. Clique para filtrar por empresa.`;
      return svgMarkup(
        'g',
        { role: 'button', tabindex: '0', 'data-company-filter': item.label, 'aria-label': label },
        [
          svgTitle(label),
          svgMarkup('rect', {
            x: rect.x,
            y: rect.y,
            width: Math.max(0, rect.width - 4),
            height: Math.max(0, rect.height - 4),
            rx: 8,
            fill,
            opacity: intensity,
          }),
          svgMarkup(
            'text',
            { x: rect.x + 10, y: rect.y + 22, class: 'solid-label' },
            escapeHtml(shortSvgLabel(item.label, 26)),
          ),
          rect.height > 54
            ? svgMarkup(
                'text',
                { x: rect.x + 10, y: rect.y + 42, class: 'solid-label' },
                escapeHtml(compactCurrency(item.value)),
              )
            : '',
        ].join(''),
      );
    })
    .join('');

  setSvg(elements.companyTreemapSvg, width, height, shapes);
  setSafeHtml(
    elements.companyTreemapTable,
    renderAccessibleTable(
      'Empresas por valor contratado',
      ['Empresa', 'Valor'],
      data.map((item) => [item.label, formatSvgCurrency(item.value)]),
    ),
  );
}

function renderComparison({ elements }, rows) {
  const managerData = buildResponsibleData(rows, 'gestor');
  const fiscalData = buildResponsibleData(rows, 'fiscal');
  const sortedManagers = sortResponsibleData(managerData).slice(0, COMPARISON_LIMIT);
  const sortedFiscals = sortResponsibleData(fiscalData).slice(0, COMPARISON_LIMIT);

  elements.comparisonSortButtons.forEach((button) => {
    const active = button.dataset.comparisonSort === advancedState.comparisonSort;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });

  renderComparisonSvg(elements.comparisonSvg, sortedManagers, sortedFiscals);
  setSafeHtml(elements.managerComparisonTable, renderResponsibleTable('Gestores', sortedManagers));
  setSafeHtml(elements.fiscalComparisonTable, renderResponsibleTable('Fiscais', sortedFiscals));
}

function renderComparisonSvg(svg, managers, fiscals) {
  const tokens = getSvgTokens();
  const width = 980;
  const height = 310;
  const left = 188;
  const top = 38;
  const rowHeight = 24;
  const chartWidth = 280;
  const managerMax = Math.max(1, ...managers.map((item) => item.value));
  const fiscalMax = Math.max(1, ...fiscals.map((item) => item.value));

  const title = svgMarkup(
    'text',
    { x: 16, y: 22, class: 'muted-label' },
    'Top responsáveis por valor contratado',
  );
  const managerBars = renderResponsibleBars(managers, {
    x: 16,
    labelX: 16,
    barX: left,
    top,
    rowHeight,
    chartWidth,
    max: managerMax,
    fill: tokens.brand,
  });
  const fiscalBars = renderResponsibleBars(fiscals, {
    x: 510,
    labelX: 510,
    barX: 680,
    top,
    rowHeight,
    chartWidth: 260,
    max: fiscalMax,
    fill: tokens.info,
  });
  const headers = [
    svgMarkup('text', { x: 16, y: 42 }, 'Gestores'),
    svgMarkup('text', { x: 510, y: 42 }, 'Fiscais'),
  ].join('');
  setSvg(svg, width, height, `${title}${headers}${managerBars}${fiscalBars}`);
}

function renderResponsibleBars(items, options) {
  return items
    .map((item, index) => {
      const y = options.top + 24 + index * options.rowHeight;
      const width = Math.max(3, (item.value / options.max) * options.chartWidth);
      const label = `${item.name}: ${formatSvgCurrency(item.value)}, ${numberFormat.format(item.count)} contrato(s), ${formatPercent(item.expiredCount, item.count)} vencidos.`;
      return [
        svgMarkup(
          'text',
          { x: options.labelX, y: y + 12, class: 'muted-label' },
          escapeHtml(shortSvgLabel(item.name, 24)),
        ),
        svgMarkup('rect', { x: options.barX, y, width, height: 14, rx: 6, fill: options.fill }),
        svgMarkup(
          'text',
          { x: options.barX + width + 8, y: y + 12, class: 'muted-label' },
          escapeHtml(compactCurrency(item.value)),
        ),
        svgMarkup('title', {}, escapeHtml(label)),
      ].join('');
    })
    .join('');
}

function renderResponsibleTable(caption, items) {
  if (!items.length) {
    return `<div class="comparison-table" role="region" tabindex="0" aria-label="Tabela ${escapeAttr(caption)}">${renderAccessibleTable(caption, ['Responsável'], [['Sem dados']])}</div>`;
  }
  const maxValue = Math.max(1, ...items.map((item) => item.value));
  return `
    <div class="comparison-table" role="region" tabindex="0" aria-label="Tabela ${escapeAttr(caption)}">
      <table>
        <caption>${escapeHtml(caption)}</caption>
        <thead>
          <tr>
            <th scope="col">Responsável</th>
            <th scope="col">Qtd.</th>
            <th scope="col">Valor</th>
            <th scope="col">% vencidos</th>
            <th scope="col">Prazo médio</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (item) => `
            <tr>
              <td>${escapeHtml(item.name)}<progress max="100" value="${escapeAttr((item.value / maxValue) * 100)}" aria-label="Participação por valor de ${escapeAttr(item.name)}"></progress></td>
              <td>${numberFormat.format(item.count)}</td>
              <td>${escapeHtml(compactCurrency(item.value))}</td>
              <td>${escapeHtml(formatPercent(item.expiredCount, item.count))}</td>
              <td>${escapeHtml(item.averageDays === null ? 'Sem prazo' : formatDays(Math.round(item.averageDays)))}</td>
            </tr>
          `,
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `;
}

function buildResponsibleData(rows, field) {
  const map = new Map();
  rows.forEach((item) => {
    const name = item.display[field];
    const current = map.get(name) || {
      name,
      count: 0,
      value: 0,
      expiredCount: 0,
      daysTotal: 0,
      daysCount: 0,
      averageDays: null,
    };
    current.count += 1;
    current.value += toFiniteNumber(item.valor) || 0;
    if (item.businessStatus.key === 'vencido') current.expiredCount += 1;
    if (!item.isClosed && item.diasAtual !== null) {
      current.daysTotal += item.diasAtual;
      current.daysCount += 1;
    }
    current.averageDays = current.daysCount ? current.daysTotal / current.daysCount : null;
    map.set(name, current);
  });
  return [...map.values()];
}

function sortResponsibleData(items) {
  const key = advancedState.comparisonSort;
  return [...items].sort((a, b) => {
    const aValue =
      key === 'expiredPercent' ? a.expiredCount / Math.max(1, a.count) : (a[key] ?? -Infinity);
    const bValue =
      key === 'expiredPercent' ? b.expiredCount / Math.max(1, b.count) : (b[key] ?? -Infinity);
    return bValue - aValue || a.name.localeCompare(b.name, 'pt-BR');
  });
}

function handleSvgFilter(context, event) {
  if (event.type === 'keydown' && !['Enter', ' '].includes(event.key)) return;
  const target = event.target.closest('[data-heatmap-month], [data-company-filter]');
  if (!target) return;
  event.preventDefault();

  if (target.dataset.heatmapMonth) {
    const month = target.dataset.heatmapMonth;
    applyFilterPatch(
      context,
      {
        search: `vencimento:${month}..${month}`,
        ano: SELECT_ALL,
      },
      { rawSearch: `vencimento:${month}..${month}`, focusFirstRow: true },
    );
    return;
  }

  if (target.dataset.companyFilter) {
    const search = `empresa:"${target.dataset.companyFilter}"`;
    applyFilterPatch(context, { search }, { rawSearch: search, focusFirstRow: true });
  }
}

function buildTimelineTicks(minTime, maxTime, count) {
  const span = Math.max(1, maxTime - minTime);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(minTime + (span / (count - 1)) * index);
    return {
      date,
      label: monthLabelFromKey(monthKeyFromDate(date)),
    };
  });
}

function squarify(items, rect) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const scaled = items.map((item) => ({
    item,
    area: (item.value / total) * rect.width * rect.height,
  }));
  const output = [];
  let remaining = { ...rect };
  let row = [];

  scaled.forEach((entry) => {
    const side = Math.min(remaining.width, remaining.height);
    const nextRow = [...row, entry];
    if (!row.length || worstRatio(row, side) >= worstRatio(nextRow, side)) {
      row = nextRow;
      return;
    }
    remaining = layoutTreemapRow(row, remaining, output);
    row = [entry];
  });
  if (row.length) layoutTreemapRow(row, remaining, output);
  return output;
}

function worstRatio(row, side) {
  const areas = row.map((item) => item.area);
  const sum = areas.reduce((total, area) => total + area, 0);
  const min = Math.min(...areas);
  const max = Math.max(...areas);
  const sideSquared = side * side;
  return Math.max((sideSquared * max) / (sum * sum), (sum * sum) / (sideSquared * min));
}

function layoutTreemapRow(row, rect, output) {
  const area = row.reduce((sum, item) => sum + item.area, 0);
  if (rect.width >= rect.height) {
    const rowHeight = area / rect.width;
    let x = rect.x;
    row.forEach((entry) => {
      const width = entry.area / rowHeight;
      output.push({ item: entry.item, x, y: rect.y, width, height: rowHeight });
      x += width;
    });
    return { x: rect.x, y: rect.y + rowHeight, width: rect.width, height: rect.height - rowHeight };
  }

  const rowWidth = area / rect.height;
  let y = rect.y;
  row.forEach((entry) => {
    const height = entry.area / rowWidth;
    output.push({ item: entry.item, x: rect.x, y, width: rowWidth, height });
    y += height;
  });
  return { x: rect.x + rowWidth, y: rect.y, width: rect.width - rowWidth, height: rect.height };
}

function renderEmptySvg(svg, message) {
  setSvg(
    svg,
    720,
    220,
    svgMarkup(
      'text',
      { x: 360, y: 112, 'text-anchor': 'middle', class: 'muted-label' },
      escapeHtml(message),
    ),
  );
}

function setSvg(svg, width, height, markup) {
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  setSafeHtml(svg, markup);
}

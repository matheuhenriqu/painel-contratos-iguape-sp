import {
  STORAGE_KEYS,
  TABLE_COLUMN_COUNT,
  VIRTUAL_TABLE_BUFFER,
  VIRTUAL_TABLE_THRESHOLD,
  collator,
  pageSize,
} from '../constants.js';
import {
  clearElement,
  escapeAttr,
  escapeHtml,
  isReducedMotion,
  isSmallViewport,
  queryAll,
  setSafeHtml,
} from '../utils/dom.js';
import { numberFormat, toFiniteNumber } from '../utils/format.js';
import { icon } from '../utils/icons.js';
import { normalizeText, slugifyClassName } from '../utils/strings.js';
import { getActiveFilterCount } from './filters.js';

const virtualTable = {
  enabled: false,
  rows: [],
  context: null,
  rowHeight: 86,
  rafId: 0,
};

export function setupTableEvents(context) {
  const { elements, state, resetVisibleLimit, render, updateUrlFromState } = context;

  elements.sortField.addEventListener('change', (event) => {
    state.sortKey = event.target.value;
    state.sortDir = state.sortKey === 'valor' ? 'desc' : 'asc';
    resetVisibleLimit();
    render();
  });

  elements.sortDirBtn.addEventListener('click', () => {
    state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
    resetVisibleLimit();
    render();
  });

  elements.densityBtn.addEventListener('click', () => {
    state.compactRows = !state.compactRows;
    storeCompactRows(state.compactRows);
    applyDensityMode(context);
    updateUrlFromState();
  });

  elements.tablePager.addEventListener('click', (event) => {
    const button = event.target.closest('[data-page-action]');
    if (!button) return;
    if (button.dataset.pageAction === 'all') {
      state.visibleLimit = Number.MAX_SAFE_INTEGER;
    } else {
      state.visibleLimit += getPageSize();
    }
    render();
  });

  elements.tableScroll.addEventListener(
    'scroll',
    () => {
      if (!virtualTable.enabled || !virtualTable.context) return;
      window.cancelAnimationFrame(virtualTable.rafId);
      virtualTable.rafId = window.requestAnimationFrame(() =>
        renderVirtualTableWindow(virtualTable.context),
      );
    },
    { passive: true },
  );

  queryAll('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sortKey = key;
        state.sortDir = key === 'valor' ? 'desc' : 'asc';
      }
      resetVisibleLimit();
      render();
    });
  });
}

export function renderTable(context, rows) {
  const { elements, state } = context;
  const visibleRows = rows.slice(0, state.visibleLimit);
  const shown = visibleRows.length;
  elements.tableCount.textContent = formatTableCount(
    context,
    shown,
    rows.length,
    'em acompanhamento',
  );
  elements.table.closest('table')?.setAttribute('aria-rowcount', String(shown + 1));

  if (!rows.length) {
    setSafeHtml(elements.table, renderEmptyRow(getHelpfulEmptyMessage(context)));
    clearElement(elements.tablePager);
    resetVirtualTable(elements);
    return;
  }

  if (rows.length > VIRTUAL_TABLE_THRESHOLD && visibleRows.length > VIRTUAL_TABLE_THRESHOLD) {
    virtualTable.enabled = true;
    virtualTable.rows = visibleRows;
    virtualTable.context = context;
    elements.tableScroll.classList.add('is-virtualized');
    renderVirtualTableWindow(context);
  } else {
    resetVirtualTable(elements);
    setSafeHtml(elements.table, renderRows(visibleRows));
  }

  renderTablePager(context, rows.length, shown);
}

export function renderSectionTable(table, countElement, rows, label, emptyMessage) {
  countElement.textContent = `${numberFormat.format(rows.length)} contrato(s) ${label} no recorte atual`;

  if (!rows.length) {
    setSafeHtml(table, renderEmptyRow(emptyMessage));
    return;
  }

  setSafeHtml(table, renderRows(rows));
}

export function renderRows(rows, options = {}) {
  const {
    startIndex = 0,
    totalRows = rows.length,
    topSpacer = 0,
    bottomSpacer = 0,
    virtualized = false,
  } = options;
  const topSpacerRow = renderVirtualSpacer(topSpacer);
  const bottomSpacerRow = renderVirtualSpacer(bottomSpacer);
  const rowHtml = rows
    .map((item, index) => {
      const rowNumber = startIndex + index + 1;
      return `
    <tr class="${escapeAttr(rowClassNames(item))}" ${virtualized ? 'data-virtual-row="true"' : ''} data-contract-row data-contract-id="${escapeAttr(item.id ?? '')}" tabindex="0" aria-rowindex="${rowNumber + 1}" aria-label="${escapeAttr(`Linha ${rowNumber} de ${totalRows}; ${getRowSummary(item)}. Pressione Enter para abrir detalhes.`)}">
      <td data-label="ID">
        <button class="row-detail-button" type="button" data-open-contract="${escapeAttr(item.id ?? '')}" aria-label="Ver detalhes do contrato ${escapeAttr(item.display.contrato)}">
          ${icon('info')}
          <span>${escapeHtml(item.id ?? '')}</span>
        </button>
      </td>
      <td data-label="Contrato" class="${escapeAttr(fieldCellClass(item, 'contrato'))}"${missingFieldTitle(item, 'contrato')}><span class="reference-code">${escapeHtml(item.display.contrato)}</span></td>
      <td data-label="Processo" class="${escapeAttr(fieldCellClass(item, 'processo'))}"${missingFieldTitle(item, 'processo')}><span class="reference-code">${escapeHtml(item.display.processo)}</span></td>
      <td class="object-cell" data-label="Objeto">
        <strong>${escapeHtml(item.display.objeto)}</strong>
      </td>
      <td data-label="Empresa" class="${escapeAttr(fieldCellClass(item, 'empresa'))}"${missingFieldTitle(item, 'empresa')}>${escapeHtml(item.display.empresa)}</td>
      <td data-label="Modalidade" class="${escapeAttr(fieldCellClass(item, 'modalidade'))}"${missingFieldTitle(item, 'modalidade')}>${escapeHtml(item.display.modalidade)}</td>
      <td class="money-cell ${escapeAttr(fieldCellClass(item, 'valor'))}" data-label="Valor"${missingFieldTitle(item, 'valor')}>${escapeHtml(item.display.valor)}</td>
      <td class="date-cell ${escapeAttr(fieldCellClass(item, 'dataVencimento'))}" data-label="Vencimento"${missingFieldTitle(item, 'dataVencimento')}>
        ${escapeHtml(item.display.dataVencimento)}
        <br><span class="timing-pill ${escapeAttr(timingClass(item))}">${escapeHtml(item.businessStatus.timingLabel)}</span>
      </td>
      <td data-label="Status" class="status-cell">${renderStatusCell(item)}</td>
      <td data-label="Gestor" class="${escapeAttr(fieldCellClass(item, 'gestor'))}"${missingFieldTitle(item, 'gestor')}>${escapeHtml(item.display.gestor)}</td>
      <td data-label="Fiscal" class="${escapeAttr(fieldCellClass(item, 'fiscal'))}"${missingFieldTitle(item, 'fiscal')}>${escapeHtml(item.display.fiscal)}</td>
    </tr>
  `;
    })
    .join('');

  return `${topSpacerRow}${rowHtml}${bottomSpacerRow}`;
}

export function renderStatusCell(item) {
  const source =
    item.businessStatus.sourceLabel &&
    normalizeText(item.businessStatus.sourceLabel) !== normalizeText(item.businessStatus.label)
      ? `<small>Planilha: ${escapeHtml(item.businessStatus.sourceLabel)}</small>`
      : '';

  return `
    <span class="status-badge ${escapeAttr(statusClass(item.businessStatus.key))}">
      ${icon(statusIcon(item.businessStatus.key))}
      <span>${escapeHtml(item.businessStatus.label)}</span>
    </span>
    ${source}
  `;
}

function statusIcon(statusKey) {
  const icons = {
    concluido: 'check-circle-2',
    encerrado: 'archive',
    'sem-informacao': 'circle-alert',
    'sem-data': 'calendar-x',
    vencido: 'circle-alert',
    'vence-hoje': 'alarm-clock',
    'proximo-de-vencer': 'alarm-clock',
    'vence-ate-30': 'clock-3',
    'vence-31-90': 'calendar-clock',
    vigente: 'check-circle-2',
  };
  return icons[statusKey] || 'info';
}

function renderVirtualTableWindow(context) {
  const { elements } = context;
  if (!virtualTable.rows.length) return;

  const viewportHeight = elements.tableScroll.clientHeight || window.innerHeight || 720;
  const scrollTop = Math.max(0, elements.tableScroll.scrollTop);
  const windowSize = Math.ceil(viewportHeight / virtualTable.rowHeight) + VIRTUAL_TABLE_BUFFER * 2;
  const maxStartIndex = Math.max(0, virtualTable.rows.length - windowSize);
  const startIndex = Math.min(
    maxStartIndex,
    Math.max(0, Math.floor(scrollTop / virtualTable.rowHeight) - VIRTUAL_TABLE_BUFFER),
  );
  const endIndex = Math.min(virtualTable.rows.length, startIndex + windowSize);
  const topSpacer = startIndex * virtualTable.rowHeight;
  const bottomSpacer = Math.max(0, (virtualTable.rows.length - endIndex) * virtualTable.rowHeight);
  const visibleRows = virtualTable.rows.slice(startIndex, endIndex);

  setSafeHtml(
    elements.table,
    renderRows(visibleRows, {
      startIndex,
      totalRows: virtualTable.rows.length,
      topSpacer,
      bottomSpacer,
      virtualized: true,
    }),
  );
  if (updateVirtualRowHeight(elements)) {
    window.cancelAnimationFrame(virtualTable.rafId);
    virtualTable.rafId = window.requestAnimationFrame(() => renderVirtualTableWindow(context));
  }
}

function updateVirtualRowHeight(elements) {
  const renderedRows = queryAll('[data-virtual-row]', elements.table).slice(0, 8);
  if (!renderedRows.length) return false;

  const averageHeight =
    renderedRows.reduce((total, row) => total + row.getBoundingClientRect().height, 0) /
    renderedRows.length;
  if (Number.isFinite(averageHeight) && averageHeight > 0) {
    const changed = Math.abs(virtualTable.rowHeight - averageHeight) > 2;
    virtualTable.rowHeight = averageHeight;
    return changed;
  }
  return false;
}

function resetVirtualTable(elements) {
  window.cancelAnimationFrame(virtualTable.rafId);
  virtualTable.enabled = false;
  virtualTable.rows = [];
  virtualTable.context = null;
  elements.tableScroll.classList.remove('is-virtualized');
}

function renderVirtualSpacer(height) {
  if (height <= 0) return '';
  return `<tr class="virtual-spacer" aria-hidden="true"><td colspan="${TABLE_COLUMN_COUNT}" height="${Math.round(height)}"></td></tr>`;
}

export function rowClassNames(item) {
  return [
    item.businessStatus.rowClass,
    item.display.isMissing.gestor ? 'row-missing-gestor' : '',
    item.display.isMissing.fiscal ? 'row-missing-fiscal' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function fieldCellClass(item, key) {
  return item.display.isMissing[key] ? 'muted missing-field' : '';
}

export function missingFieldTitle(item, key) {
  if (!item.display.isMissing[key]) return '';
  const labels = {
    contrato: 'contrato',
    processo: 'processo',
    empresa: 'empresa',
    modalidade: 'modalidade',
    valor: 'valor',
    dataVencimento: 'data de vencimento',
    gestor: 'gestor',
    fiscal: 'fiscal',
  };
  return ` title="${escapeAttr(`Campo incompleto: ${labels[key] || key} não informado na planilha.`)}"`;
}

export function getRowSummary(item) {
  return [
    `Contrato ${item.display.contrato}`,
    `processo ${item.display.processo}`,
    item.display.objeto,
    `status ${item.businessStatus.label}`,
    `vencimento ${item.display.dataVencimento}`,
  ].join('; ');
}

export function sortRows(rows, state) {
  const sorted = [...rows];
  const dir = state.sortDir === 'asc' ? 1 : -1;
  sorted.sort((a, b) => compareRowsBySort(a, b, state.sortKey, dir));
  return sorted;
}

export function compareRowsBySort(a, b, key, dir) {
  const fallback = Number(a.id || 0) - Number(b.id || 0);

  if (key === 'dataVencimento') {
    const result = compareNullableValues(
      a.dataVencimentoDate?.getTime(),
      b.dataVencimentoDate?.getTime(),
      (av, bv) => av - bv,
    );
    return result === 0 ? fallback : result * dir;
  }

  if (key === 'valor' || key === 'id') {
    const result = compareNullableValues(
      toFiniteNumber(a[key]),
      toFiniteNumber(b[key]),
      (av, bv) => av - bv,
    );
    return result === 0 ? fallback : result * dir;
  }

  const result = compareNullableValues(getSortValue(a, key), getSortValue(b, key), (av, bv) =>
    collator.compare(String(av), String(bv)),
  );
  return result === 0 ? fallback : result * dir;
}

export function getSortValue(item, key) {
  if (key === 'status') return item.businessStatus.label;
  if (key === 'modalidade' || key === 'gestor' || key === 'fiscal') return item.display[key];
  return item[key];
}

export function compareNullableValues(a, b, compare) {
  const aMissing = isMissingSortValue(a);
  const bMissing = isMissingSortValue(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return compare(a, b);
}

export function isMissingSortValue(value) {
  if (value === null || value === undefined || value === '') return true;
  return typeof value === 'number' && Number.isNaN(value);
}

export function sortByDueDateAsc(rows) {
  return [...rows].sort(compareDueDateAsc);
}

export function compareDueDateAsc(a, b) {
  const aMissing = !a.dataVencimentoDate;
  const bMissing = !b.dataVencimentoDate;
  if (aMissing && bMissing) return Number(a.id || 0) - Number(b.id || 0);
  if (aMissing) return 1;
  if (bMissing) return -1;
  const result = a.dataVencimentoDate.getTime() - b.dataVencimentoDate.getTime();
  return result === 0 ? Number(a.id || 0) - Number(b.id || 0) : result;
}

export function renderSortIndicators(context) {
  const { state } = context;
  queryAll('[data-sort]').forEach((button) => {
    const label = button.dataset.label || button.textContent.trim().replace(/[↑↓]$/, '').trim();
    button.dataset.label = label;
    const active = button.dataset.sort === state.sortKey;
    const direction = state.sortDir === 'asc' ? 'ascending' : 'descending';
    const headerCell = button.closest('th');
    button.classList.toggle('is-sorted', active);
    button.textContent = active ? `${label} ${state.sortDir === 'asc' ? '↑' : '↓'}` : label;
    button.setAttribute(
      'aria-label',
      active
        ? `Ordenar por ${label}, atualmente ${state.sortDir === 'asc' ? 'crescente' : 'decrescente'}`
        : `Ordenar por ${label}`,
    );
    button.removeAttribute('aria-sort');
    if (headerCell) headerCell.setAttribute('aria-sort', active ? direction : 'none');
  });
  syncSortControls(context);
}

export function isCurrentContract(item) {
  return item.businessStatus.group === 'current';
}

export function isExpiredContract(item) {
  return item.businessStatus.group === 'expired';
}

export function isCompletedContract(item) {
  return item.businessStatus.group === 'closed';
}

export function syncSortControls({ elements, state }) {
  elements.sortField.value = state.sortKey;
  elements.sortDirLabel.textContent = state.sortDir === 'asc' ? 'Crescente' : 'Decrescente';
  elements.sortDirBtn.classList.toggle('is-desc', state.sortDir === 'desc');
}

export function renderEmptyRow(message) {
  return `<tr><td colspan="${TABLE_COLUMN_COUNT}" class="empty-state">${escapeHtml(message)}</td></tr>`;
}

export function getHelpfulEmptyMessage(context) {
  if (!getActiveFilterCount(context)) return 'Nenhum contrato encontrado.';
  const { state } = context;
  if (state.modalidade !== 'todos') {
    return 'Nenhum contrato com esses filtros. Tente limpar o filtro de modalidade.';
  }
  if (state.gestor !== 'todos') {
    return 'Nenhum contrato com esses filtros. Tente limpar o filtro de gestor.';
  }
  if (state.fiscal !== 'todos') {
    return 'Nenhum contrato com esses filtros. Tente limpar o filtro de fiscal.';
  }
  if (state.search) {
    return 'Nenhum contrato com essa busca. Tente remover operadores ou reduzir o texto pesquisado.';
  }
  return 'Nenhum contrato com esses filtros. Tente limpar um recorte ativo.';
}

export function applyDensityMode({ elements, state }) {
  document.body.classList.toggle('is-compact', state.compactRows);
  elements.densityBtn.setAttribute('aria-pressed', String(state.compactRows));
  elements.densityBtn.classList.toggle('is-active', state.compactRows);
  elements.densityBtn.setAttribute(
    'aria-label',
    state.compactRows ? 'Ativar modo confortável' : 'Ativar modo compacto',
  );
  elements.densityLabel.textContent = state.compactRows ? 'Confortável' : 'Compacto';
}

export function getStoredCompactRows() {
  try {
    return localStorage.getItem(STORAGE_KEYS.compactRows) === 'true';
  } catch {
    return false;
  }
}

export function storeCompactRows(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.compactRows, String(value));
  } catch {
    // The view still works when browser storage is unavailable.
  }
}

export function formatTableCount({ records }, shown, filteredTotal, label = 'contratos') {
  const shownText = numberFormat.format(shown);
  const filteredText = numberFormat.format(filteredTotal);
  const totalText = numberFormat.format(records.length);
  if (filteredTotal === records.length) return `Mostrando ${shownText} de ${totalText} ${label}`;
  return `Mostrando ${shownText} de ${filteredText} ${label} · ${totalText} contratos na base`;
}

export function renderTablePager({ elements }, total, shown) {
  if (shown >= total) {
    clearElement(elements.tablePager);
    return;
  }

  const remaining = total - shown;
  setSafeHtml(
    elements.tablePager,
    `
    <span>${numberFormat.format(remaining)} contrato(s) restantes</span>
    <div>
      <button class="pager-button" type="button" data-page-action="more">
        ${icon('chevrons-down')}
        <span>Mostrar mais</span>
      </button>
      <button class="pager-button" type="button" data-page-action="all">
        ${icon('list')}
        <span>Mostrar todos</span>
      </button>
    </div>
  `,
  );
}

export function resetVisibleLimit(state) {
  state.visibleLimit = getPageSize();
}

export function getPageSize() {
  return isSmallViewport() ? pageSize.mobile : pageSize.desktop;
}

export function formatContractTiming(item) {
  return item.businessStatus.timingLabel;
}

export function deadlineRowClass(item) {
  return item.businessStatus.rowClass;
}

export function timingClass(item) {
  return `timing-${item.businessStatus.tone}`;
}

export function statusClass(status) {
  const slug = slugifyClassName(status);
  return `status-${slug || 'sem-status'}`;
}

export function scrollToTop() {
  window.scrollTo({ top: 0, behavior: isReducedMotion() ? 'auto' : 'smooth' });
}

export function focusVisibleContractByOffset(offset) {
  const rows = queryAll('[data-contract-row], [data-contract-card]').filter(
    (element) => !element.hidden && element.offsetParent !== null,
  );
  if (!rows.length) return;
  const currentIndex = Math.max(0, rows.indexOf(document.activeElement));
  const nextIndex = Math.min(rows.length - 1, Math.max(0, currentIndex + offset));
  rows[nextIndex].focus();
}

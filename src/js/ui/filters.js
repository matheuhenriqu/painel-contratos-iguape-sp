import { BREAKPOINTS, LRU_CACHE_LIMIT, SELECT_ALL, defaultSort } from '../constants.js';
import {
  addMediaChangeListener,
  escapeAttr,
  escapeHtml,
  fillSelect,
  isFilterViewport,
  setSafeHtml,
} from '../utils/dom.js';
import { formatUpdatedAt, numberFormat } from '../utils/format.js';
import { icon } from '../utils/icons.js';
import { matchesSearchQuery } from '../utils/search.js';
import { normalizeText, unique } from '../utils/strings.js';

let userToggledFilters = false;
const filterCache = new Map();

export function hydrateFilters({ elements, records, sourceData }) {
  fillSelect(
    elements.statusFilter,
    'Todos',
    unique(records.map((item) => item.businessStatus.label)),
  );
  fillSelect(
    elements.modalidadeFilter,
    'Todas',
    unique(records.map((item) => item.display.modalidade)),
  );
  fillSelect(elements.gestorFilter, 'Todos', unique(records.map((item) => item.display.gestor)));
  fillSelect(elements.fiscalFilter, 'Todos', unique(records.map((item) => item.display.fiscal)));
  const years = unique(records.map((item) => item.anoVencimento)).sort((a, b) => {
    if (a === 'Sem data de vencimento') return 1;
    if (b === 'Sem data de vencimento') return -1;
    return Number(a) - Number(b);
  });
  fillSelect(elements.anoFilter, 'Todos', years);

  const dataUpdatedAt = sourceData.updatedAt || sourceData.generatedAt;
  elements.updatedLabel.textContent = `Atualizado: ${formatUpdatedAt(dataUpdatedAt)} · ${numberFormat.format(records.length)} contratos`;
  elements.updatedLabel.title = `Última atualização dos dados: ${formatUpdatedAt(dataUpdatedAt, true)}`;
}

export function setupFilterEvents(context) {
  const { elements, state, render, queueRender, resetVisibleLimit } = context;

  elements.toggleFiltersBtn.addEventListener('click', () => {
    if (!isFilterViewport()) {
      setFiltersCollapsed(elements, false);
      return;
    }
    userToggledFilters = true;
    setFiltersCollapsed(elements, !elements.filters.classList.contains('is-collapsed'));
  });

  addMediaChangeListener(window.matchMedia(`(max-width: ${BREAKPOINTS.filters}px)`), (event) => {
    if (!event.matches) {
      userToggledFilters = false;
      setFiltersCollapsed(elements, false);
      return;
    }
    if (!userToggledFilters) setFiltersCollapsed(elements, true);
  });

  elements.searchInput.addEventListener('input', (event) => {
    state.search = normalizeText(event.target.value);
    resetVisibleLimit();
    updateSearchClearButton(elements);
    updateFilterControls(context);
    queueRender();
  });

  elements.clearSearchBtn.addEventListener('click', () => {
    state.search = '';
    elements.searchInput.value = '';
    resetVisibleLimit();
    updateSearchClearButton(elements);
    render();
    elements.searchInput.focus();
  });

  elements.quickFilterButtons.forEach((button) => {
    button.addEventListener('click', () => {
      applyQuickFilter(context, button.dataset.quickFilter);
    });
  });

  [
    ['status', elements.statusFilter],
    ['modalidade', elements.modalidadeFilter],
    ['gestor', elements.gestorFilter],
    ['fiscal', elements.fiscalFilter],
    ['prazo', elements.prazoFilter],
    ['ano', elements.anoFilter],
  ].forEach(([key, element]) => {
    element.addEventListener('change', (event) => {
      state[key] = event.target.value;
      resetVisibleLimit();
      render();
    });
  });

  elements.activeFilters.addEventListener('click', (event) => {
    const button = event.target.closest('[data-clear-filter]');
    if (!button) return;
    clearSingleFilter(context, button.dataset.clearFilter);
  });

  elements.clearFiltersBtn.addEventListener('click', () => {
    clearAllFilters(context);
  });
}

export function getFilteredRows({ records, state }) {
  return applyFilters(records, getFilterSnapshot(state));
}

export function applyFilters(records, filters) {
  const cacheKey = getFilterCacheKey(records, filters);
  const cached = getCached(filterCache, cacheKey);
  if (cached) return cached;

  const rows = records.filter((item) => {
    if (filters.search && !matchesSearchQuery(item, filters.search)) return false;
    if (filters.status !== SELECT_ALL && item.businessStatus.label !== filters.status) return false;
    if (filters.modalidade !== SELECT_ALL && item.display.modalidade !== filters.modalidade) {
      return false;
    }
    if (filters.gestor !== SELECT_ALL && item.display.gestor !== filters.gestor) return false;
    if (filters.fiscal !== SELECT_ALL && item.display.fiscal !== filters.fiscal) return false;
    if (filters.prazo !== SELECT_ALL && !matchesPrazoFilter(item, filters)) return false;
    if (filters.ano !== SELECT_ALL && item.anoVencimento !== filters.ano) return false;
    return true;
  });

  setCached(filterCache, cacheKey, rows);
  return rows;
}

export function syncFilterInputs(context) {
  const { elements, state } = context;
  elements.statusFilter.value = state.status;
  elements.modalidadeFilter.value = state.modalidade;
  elements.gestorFilter.value = state.gestor;
  elements.fiscalFilter.value = state.fiscal;
  elements.prazoFilter.value = state.prazo;
  elements.anoFilter.value = state.ano;
  updateSearchClearButton(elements);
  updateFilterControls(context);
}

export function renderActiveFilters({ elements, state }) {
  const chipData = [];
  if (state.search) chipData.push({ key: 'search', label: `Busca: ${elements.searchInput.value}` });
  if (state.status !== SELECT_ALL) {
    chipData.push({ key: 'status', label: `Status: ${state.status}` });
  }
  if (state.prazo !== SELECT_ALL) {
    chipData.push({
      key: 'prazo',
      label: `Prazo: ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`,
    });
  }
  if (state.modalidade !== SELECT_ALL) {
    chipData.push({ key: 'modalidade', label: `Modalidade: ${state.modalidade}` });
  }
  if (state.gestor !== SELECT_ALL) {
    chipData.push({ key: 'gestor', label: `Gestor: ${state.gestor}` });
  }
  if (state.fiscal !== SELECT_ALL) {
    chipData.push({ key: 'fiscal', label: `Fiscal: ${state.fiscal}` });
  }
  if (state.ano !== SELECT_ALL) chipData.push({ key: 'ano', label: `Ano: ${state.ano}` });

  if (!chipData.length) {
    setSafeHtml(elements.activeFilters, '<span class="sr-only">Nenhum filtro ativo</span>');
    return;
  }

  setSafeHtml(
    elements.activeFilters,
    chipData
      .map(
        (chip) => `
    <button class="filter-chip" type="button" data-clear-filter="${escapeAttr(chip.key)}" aria-label="Remover filtro ${escapeAttr(chip.label)}">
      <span>${escapeHtml(chip.label)}</span>
      ${icon('x')}
    </button>
  `,
      )
      .join(''),
  );
}

export function renderResultSummaryWithState(context, metrics) {
  const prefix = getActiveFilterCount(context)
    ? 'resultado(s) encontrado(s)'
    : 'contrato(s) na base';
  context.elements.resultSummary.textContent = [
    `${numberFormat.format(metrics.filteredContracts)} ${prefix}`,
    `${numberFormat.format(metrics.currentCount)} em acompanhamento`,
    `${numberFormat.format(metrics.expiredCount)} vencido(s)`,
    `${numberFormat.format(metrics.closedCount)} encerrado(s)/concluído(s)`,
  ].join(' · ');
}

export function updateFilterControls(context) {
  const { elements } = context;
  const count = getActiveFilterCount(context);
  elements.filterCountBadge.hidden = count === 0;
  elements.filterCountBadge.textContent = count ? numberFormat.format(count) : '';
  elements.clearFiltersBtn.disabled = !hasActiveAdjustments(context);
}

export function getActiveFilterCount({ state }) {
  return [
    state.search,
    state.status !== SELECT_ALL,
    state.prazo !== SELECT_ALL,
    state.modalidade !== SELECT_ALL,
    state.gestor !== SELECT_ALL,
    state.fiscal !== SELECT_ALL,
    state.ano !== SELECT_ALL,
  ].filter(Boolean).length;
}

export function hasActiveAdjustments({ state }) {
  return (
    getActiveFilterCount({ state }) > 0 ||
    state.sortKey !== defaultSort.key ||
    state.sortDir !== defaultSort.dir
  );
}

export function renderQuickFilterIndicators({ elements, state }) {
  const current = getCurrentQuickFilter(state);
  elements.quickFilterButtons.forEach((button) => {
    const active = button.dataset.quickFilter === current;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}

export function configureFilterPanel({ elements }) {
  setFiltersCollapsed(elements, isFilterViewport());
}

export function expandFilters({ elements }) {
  setFiltersCollapsed(elements, false);
}

export function updateSearchClearButton(elements) {
  elements.clearSearchBtn.hidden = !elements.searchInput.value;
}

export function applyQuickFilter(context, filter) {
  const { elements, state, resetVisibleLimit, render } = context;
  const values = {
    status: SELECT_ALL,
    prazo: SELECT_ALL,
  };

  if (filter === 'ativos') values.status = 'Vigente';
  if (filter === 'vencidos') values.prazo = 'vencido';
  if (filter === '30') values.prazo = '30';
  if (filter === 'criticos') values.prazo = 'critico';

  state.status = values.status;
  state.prazo = values.prazo;
  elements.statusFilter.value = values.status;
  elements.prazoFilter.value = values.prazo;
  resetVisibleLimit();
  render();
}

export function applyFilterPatch(context, values, options = {}) {
  const { elements, state, resetVisibleLimit, render } = context;
  const { rawSearch, ...stateValues } = values;
  Object.assign(state, stateValues);
  if (Object.prototype.hasOwnProperty.call(values, 'search')) {
    elements.searchInput.value = options.rawSearch ?? rawSearch ?? values.search ?? '';
    state.search = normalizeText(elements.searchInput.value);
  }
  syncFilterInputs(context);
  context.syncSortControls?.(context);
  resetVisibleLimit();
  render();
  if (options.focusFirstRow) {
    window.setTimeout(() => focusFirstVisibleContract(), 0);
  }
}

export function clearAllFilters(context, options = {}) {
  applyFilterPatch(
    context,
    {
      search: '',
      status: SELECT_ALL,
      modalidade: SELECT_ALL,
      gestor: SELECT_ALL,
      fiscal: SELECT_ALL,
      prazo: SELECT_ALL,
      ano: SELECT_ALL,
      sortKey: defaultSort.key,
      sortDir: defaultSort.dir,
    },
    { ...options, rawSearch: '' },
  );
  if (!options.focusFirstRow && options.focusSearch !== false) {
    window.setTimeout(() => context.elements.searchInput.focus(), 0);
  }
}

export function clearSearch(context) {
  applyFilterPatch(context, { search: '' }, { rawSearch: '', focusFirstRow: false });
  context.elements.searchInput.focus();
}

function getCurrentQuickFilter(state) {
  if (state.status === 'Vigente' && state.prazo === SELECT_ALL) return 'ativos';
  if (state.status === SELECT_ALL && state.prazo === 'vencido') return 'vencidos';
  if (state.status === SELECT_ALL && state.prazo === '30') return '30';
  if (state.status === SELECT_ALL && state.prazo === SELECT_ALL) return SELECT_ALL;
  return '';
}

function matchesPrazoFilter(item, state) {
  if (item.isClosed) return false;
  if (state.prazo === 'critico') {
    return (
      item.businessStatus.prazoBucket === 'vencido' ||
      item.businessStatus.prazoBucket === 'hoje' ||
      item.businessStatus.key === 'proximo-de-vencer'
    );
  }
  return item.businessStatus.prazoBucket === state.prazo;
}

function getFilterSnapshot(state) {
  return {
    search: state.search,
    status: state.status,
    modalidade: state.modalidade,
    gestor: state.gestor,
    fiscal: state.fiscal,
    prazo: state.prazo,
    ano: state.ano,
  };
}

function getFilterCacheKey(records, filters) {
  return JSON.stringify({
    total: records.length,
    first: records[0]?.id ?? null,
    last: records.at(-1)?.id ?? null,
    filters,
  });
}

function getCached(cache, key) {
  if (!cache.has(key)) return null;
  const value = cache.get(key);
  cache.delete(key);
  cache.set(key, value);
  return value;
}

function setCached(cache, key, value) {
  cache.set(key, value);
  if (cache.size > LRU_CACHE_LIMIT) {
    cache.delete(cache.keys().next().value);
  }
}

function setFiltersCollapsed(elements, collapsed) {
  const shouldCollapse = isFilterViewport() && collapsed;
  const label = shouldCollapse
    ? 'Mostrar filtros'
    : isFilterViewport()
      ? 'Ocultar filtros'
      : 'Filtros';

  elements.filters.classList.toggle('is-collapsed', shouldCollapse);
  elements.toggleFiltersBtn.setAttribute('aria-expanded', String(!shouldCollapse));
  elements.toggleFiltersBtn.setAttribute('aria-label', label);
  elements.filterToggleLabel.textContent = label;
}

function clearSingleFilter(context, key) {
  const { elements, state, resetVisibleLimit, render } = context;
  if (key === 'search') {
    state.search = '';
    elements.searchInput.value = '';
    updateSearchClearButton(elements);
  } else if (Object.prototype.hasOwnProperty.call(state, key)) {
    state[key] = SELECT_ALL;
    const select = elements[`${key}Filter`];
    if (select) select.value = SELECT_ALL;
  }
  resetVisibleLimit();
  render();
}

function focusFirstVisibleContract() {
  document.querySelector('[data-contract-row], [data-contract-card]')?.focus();
}

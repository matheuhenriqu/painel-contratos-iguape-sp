import { RENDER_DEBOUNCE_MS } from './constants.js';
import { buildDashboardMetrics } from './data/aggregate.js';
import { normalizeRecords } from './data/normalize.js';
import { getSourceData } from './data/source.js';
import { validateSourceRecords } from './data/validation.js';
import { state } from './state/store.js';
import { restoreStateFromUrl, updateUrlFromState as syncUrlFromState } from './state/url-sync.js';
import { getAppElements, setSafeHtml } from './utils/dom.js';
import { startOfDay } from './utils/dates.js';
import {
  renderAdvancedVisualizations,
  setupAdvancedVisualizations,
} from './ui/advanced-visualizations.js';
import { renderCharts } from './ui/charts.js';
import { openContractFromHash, setupContractDetails } from './ui/contract-details.js';
import { exportFilteredCsv } from './ui/export-csv.js';
import { exportFilteredJson } from './ui/export-json.js';
import { exportFilteredPdf } from './ui/export-pdf.js';
import { exportFilteredXlsx } from './ui/export-xlsx.js';
import { announceFilterResults } from './ui/feedback.js';
import {
  configureFilterPanel,
  getFilteredRows,
  hydrateFilters,
  renderActiveFilters,
  renderQuickFilterIndicators,
  renderResultSummaryWithState,
  setupFilterEvents,
  syncFilterInputs,
  updateFilterControls,
} from './ui/filters.js';
import { renderInsights, renderKpis, setupKpiEvents } from './ui/kpis.js';
import { setupKeyboardShortcuts } from './ui/keyboard.js';
import { setupBackToTop } from './ui/back-to-top.js';
import { renderDataWarnings, setupDataWarnings } from './ui/data-warnings.js';
import { renderMobileCards, setupMobileCards, syncMobileView } from './ui/mobile-cards.js';
import { setupPrintButton } from './ui/print.js';
import { renderQuality } from './ui/quality.js';
import { setupSavedFilters } from './ui/saved-filters.js';
import { setupSectionToggles } from './ui/section-toggles.js';
import { copyCurrentSummary, renderAutoSummary, updateActionControls } from './ui/summary.js';
import { setupTheme } from './ui/theme.js';
import { shareCurrentView } from './ui/share.js';
import { renderUrgencyBanner, setupUrgencyBanner } from './ui/urgency.js';
import { setupServiceWorker } from './pwa/service-worker-registration.js';
import {
  applyDensityMode,
  getStoredCompactRows,
  isCompletedContract,
  isCurrentContract,
  isExpiredContract,
  renderSectionTable,
  renderSortIndicators,
  renderTable,
  resetVisibleLimit as resetTableVisibleLimit,
  setupTableEvents,
  sortRows,
  syncSortControls,
} from './ui/table.js';

const sourceData = getSourceData();
let records = [];
const elements = getAppElements();
const viewState = {
  filteredRows: [],
  currentRows: [],
  expiredRows: [],
  completedRows: [],
  metrics: null,
  summaryText: '',
};
const dataWarnings = validateSourceRecords(sourceData);
let searchRenderTimer = null;

const context = {
  elements,
  records,
  render,
  resetVisibleLimit,
  sourceData,
  state,
  updateUrlFromState,
  viewState,
  queueRender,
  syncSortControls,
};

async function init() {
  renderDataLoadingState();
  records = await loadNormalizedRecords(sourceData);
  context.records = records;
  clearDataLoadingState();
  resetVisibleLimit();
  hydrateFilters(context);
  restoreStateFromUrl({ ...context, useStoredDensity: true, getStoredCompactRows });
  syncFilterInputs(context);
  syncSortControls(context);
  applyDensityMode(context);
  configureFilterPanel(context);
  setupTheme(context);
  bindEvents();
  setupServiceWorker(context);
  render();
  openContractFromHash(context);
}

function bindEvents() {
  setupFilterEvents(context);
  setupTableEvents(context);
  setupMobileCards(context);
  setupKpiEvents(context);
  setupSavedFilters(context);
  setupKeyboardShortcuts(context);
  setupContractDetails(context);
  setupDataWarnings(context);
  setupUrgencyBanner(context);
  setupSectionToggles(context);
  setupBackToTop(context);
  setupPrintButton(context);
  setupAdvancedVisualizations(context);

  elements.copySummaryBtn.addEventListener('click', () => copyCurrentSummary(context));
  elements.exportCsvBtn.addEventListener('click', () => exportFilteredCsv(context));
  elements.exportXlsxBtn.addEventListener('click', () => exportFilteredXlsx(context));
  elements.exportPdfBtn.addEventListener('click', () => exportFilteredPdf(context));
  elements.exportJsonBtn.addEventListener('click', () => exportFilteredJson(context));
  elements.shareReportBtn.addEventListener('click', () => shareCurrentView(context));

  window.addEventListener('popstate', () => {
    restoreStateFromUrl({ ...context, useStoredDensity: false, getStoredCompactRows });
    syncFilterInputs(context);
    syncSortControls(context);
    applyDensityMode(context);
    resetVisibleLimit();
    render({ syncUrl: false });
  });

  window.addEventListener('theme:changed', () => {
    render({ syncUrl: false });
  });
}

function render(options = {}) {
  const filtered = getFilteredRows(context);
  const currentRows = sortRows(filtered.filter(isCurrentContract), state);
  const expiredRows = sortRows(filtered.filter(isExpiredContract), state);
  const completedRows = sortRows(filtered.filter(isCompletedContract), state);
  const metrics = buildDashboardMetrics(
    filtered,
    currentRows,
    expiredRows,
    completedRows,
    records,
    sourceData,
  );
  updateViewState(filtered, currentRows, expiredRows, completedRows, metrics);
  renderKpis(context, metrics);
  renderInsights(context, filtered, metrics);
  renderQuality(context, metrics);
  renderUrgencyBanner(context, metrics);
  renderDataWarnings(context, dataWarnings);
  renderAutoSummary(context, metrics);
  renderCharts(context, filtered, metrics);
  renderAdvancedVisualizations(context, filtered, metrics);
  renderQuickFilterIndicators(context);
  renderActiveFilters(context);
  renderResultSummaryWithState(context, metrics);
  announceFilterResults(elements, filtered.length);
  updateFilterControls(context);
  updateActionControls(context, filtered.length);
  renderTable(context, currentRows);
  renderMobileCards(context, currentRows);
  syncMobileView(context);
  renderSectionTable(
    elements.expiredTable,
    elements.expiredTableCount,
    expiredRows,
    'vencido(s)',
    'Nenhum contrato vencido no recorte atual.',
  );
  renderSectionTable(
    elements.completedTable,
    elements.completedTableCount,
    completedRows,
    'encerrado(s)/concluído(s)',
    'Nenhum contrato encerrado ou concluído no recorte atual.',
  );
  renderSortIndicators(context);
  window.__CONTRATOS_IGUAPE_STATE__ = {
    total: records.length,
    filtered: filtered.length,
    current: currentRows.length,
    expired: expiredRows.length,
    completed: completedRows.length,
    totalValue: metrics.totalValue,
    filteredValue: metrics.filteredValue,
    sortKey: state.sortKey,
    sortDir: state.sortDir,
  };
  if (options.syncUrl !== false) updateUrlFromState();
}

function updateViewState(filteredRows, currentRows, expiredRows, completedRows, metrics) {
  viewState.filteredRows = filteredRows;
  viewState.currentRows = currentRows;
  viewState.expiredRows = expiredRows;
  viewState.completedRows = completedRows;
  viewState.metrics = metrics;
}

function resetVisibleLimit() {
  resetTableVisibleLimit(state);
}

function queueRender() {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, RENDER_DEBOUNCE_MS);
}

function updateUrlFromState() {
  syncUrlFromState(context);
}

async function loadNormalizedRecords(data) {
  if (!('Worker' in window)) {
    return normalizeRecords(data, startOfDay(new Date()));
  }

  try {
    return await normalizeRecordsInWorker(data);
  } catch (error) {
    console.warn('Normalização em Worker indisponível; usando thread principal.', error);
    return normalizeRecords(data, startOfDay(new Date()));
  }
}

function normalizeRecordsInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./workers/dataset.worker.js', import.meta.url), {
      type: 'module',
    });
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(new Error('Tempo limite ao processar os contratos.'));
    }, 5000);

    worker.addEventListener('message', (event) => {
      window.clearTimeout(timeout);
      worker.terminate();

      if (event.data?.type === 'success') {
        resolve(event.data.records);
        return;
      }

      reject(new Error(event.data?.message || 'Falha ao processar os contratos.'));
    });

    worker.addEventListener('error', (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(new Error(event.message || 'Erro no Worker de contratos.'));
    });

    worker.postMessage({
      sourceData: data,
      todayIso: new Date().toISOString(),
    });
  });
}

function renderDataLoadingState() {
  elements.kpiGrid.setAttribute('aria-busy', 'true');
  setSafeHtml(
    elements.kpiGrid,
    Array.from(
      { length: 4 },
      () => `
        <article class="kpi-card skeleton-card" aria-hidden="true">
          <span></span>
          <strong></strong>
          <small></small>
        </article>
      `,
    ).join(''),
  );
}

function clearDataLoadingState() {
  elements.kpiGrid.removeAttribute('aria-busy');
}

document.addEventListener('DOMContentLoaded', () => {
  void init();
});

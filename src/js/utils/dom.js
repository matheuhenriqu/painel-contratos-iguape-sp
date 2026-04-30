import { BREAKPOINTS, SELECT_ALL } from '../constants.js';

export function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }
  return element;
}

export function queryAll(selector, root = document) {
  return [...root.querySelectorAll(selector)];
}

export function addMediaChangeListener(mediaQuery, listener) {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return;
  }
  mediaQuery.addListener(listener);
}

export function fillSelect(select, allLabel, options) {
  const fragment = document.createDocumentFragment();
  fragment.append(createOption(SELECT_ALL, allLabel));
  options.forEach((option) => {
    fragment.append(createOption(option, option));
  });
  select.replaceChildren(fragment);
}

export function createOption(value, label) {
  const option = document.createElement('option');
  option.value = String(value);
  option.textContent = String(label);
  return option;
}

export function createEl(tagName, attributes = {}, children = []) {
  const element = document.createElement(tagName);
  Object.entries(attributes).forEach(([name, value]) => {
    if (value === false || value === null || value === undefined) return;
    if (name === 'className') {
      element.className = value;
      return;
    }
    if (name === 'textContent') {
      element.textContent = value;
      return;
    }
    element.setAttribute(name, value === true ? '' : String(value));
  });
  children.forEach((child) => element.append(child));
  return element;
}

export function setSafeHtml(element, html) {
  // Use only with templates whose dynamic data was passed through escapeHtml/escapeAttr.
  element.innerHTML = html;
}

export function clearElement(element) {
  element.replaceChildren();
}

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#096;');
}

export function isSmallViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.small}px)`).matches;
}

export function isFilterViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.filters}px)`).matches;
}

export function isReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function getAppElements() {
  return {
    updatedLabel: queryRequired('#updatedLabel'),
    updateBanner: queryRequired('#updateBanner'),
    updateNowBtn: queryRequired('#updateNowBtn'),
    urgencyBanner: queryRequired('#urgencyBanner'),
    urgencyCount: queryRequired('#urgencyCount'),
    urgencyViewBtn: queryRequired('#urgencyViewBtn'),
    urgencyDismissBtn: queryRequired('#urgencyDismissBtn'),
    dataWarningsBanner: queryRequired('#dataWarningsBanner'),
    dataWarningsTitle: queryRequired('#dataWarningsTitle'),
    dataWarningsSummary: queryRequired('#dataWarningsSummary'),
    dataWarningsDetailsBtn: queryRequired('#dataWarningsDetailsBtn'),
    dataWarningsDialog: queryRequired('#dataWarningsDialog'),
    dataWarningsCloseBtn: queryRequired('#dataWarningsCloseBtn'),
    dataWarningsList: queryRequired('#dataWarningsList'),
    dataWarningsMailto: queryRequired('#dataWarningsMailto'),
    filters: queryRequired('.filters'),
    toggleFiltersBtn: queryRequired('#toggleFiltersBtn'),
    filterToggleLabel: queryRequired('#filterToggleLabel'),
    quickFilterButtons: queryAll('[data-quick-filter]'),
    saveFilterBtn: queryRequired('#saveFilterBtn'),
    exportFiltersBtn: queryRequired('#exportFiltersBtn'),
    importFiltersBtn: queryRequired('#importFiltersBtn'),
    importFiltersInput: queryRequired('#importFiltersInput'),
    savedFiltersList: queryRequired('#savedFiltersList'),
    filterCountBadge: queryRequired('#filterCountBadge'),
    kpiGrid: queryRequired('#kpiGrid'),
    insightGrid: queryRequired('#insightGrid'),
    statusFilter: queryRequired('#statusFilter'),
    modalidadeFilter: queryRequired('#modalidadeFilter'),
    gestorFilter: queryRequired('#gestorFilter'),
    fiscalFilter: queryRequired('#fiscalFilter'),
    prazoFilter: queryRequired('#prazoFilter'),
    anoFilter: queryRequired('#anoFilter'),
    searchInput: queryRequired('#searchInput'),
    clearSearchBtn: queryRequired('#clearSearchBtn'),
    clearFiltersBtn: queryRequired('#clearFiltersBtn'),
    table: queryRequired('#contractsTable'),
    tableScroll: queryRequired('#contractsTableScroll'),
    contractCards: queryRequired('#contractsCards'),
    tableCount: queryRequired('#tableCount'),
    tablePager: queryRequired('#tablePager'),
    expiredTable: queryRequired('#expiredContractsTable'),
    expiredTableCount: queryRequired('#expiredTableCount'),
    completedTable: queryRequired('#completedContractsTable'),
    completedTableCount: queryRequired('#completedTableCount'),
    activeFilters: queryRequired('#activeFilters'),
    sortField: queryRequired('#sortField'),
    sortDirBtn: queryRequired('#sortDirBtn'),
    sortDirLabel: queryRequired('#sortDirLabel'),
    densityBtn: queryRequired('#densityBtn'),
    densityLabel: queryRequired('#densityLabel'),
    mobileViewToggleBtn: queryRequired('#mobileViewToggleBtn'),
    mobileViewToggleLabel: queryRequired('#mobileViewToggleLabel'),
    resultSummary: queryRequired('#resultSummary'),
    autoSummary: queryRequired('#autoSummary'),
    actionFeedback: queryRequired('#actionFeedback'),
    copySummaryBtn: queryRequired('#copySummaryBtn'),
    exportCsvBtn: queryRequired('#exportCsvBtn'),
    exportXlsxBtn: queryRequired('#exportXlsxBtn'),
    exportPdfBtn: queryRequired('#exportPdfBtn'),
    exportJsonBtn: queryRequired('#exportJsonBtn'),
    shareReportBtn: queryRequired('#shareReportBtn'),
    printReportBtn: queryRequired('#printReportBtn'),
    printReportMeta: queryRequired('#printReportMeta'),
    printGeneratedAt: queryRequired('#printGeneratedAt'),
    printFiltersList: queryRequired('#printFiltersList'),
    printQrCode: queryRequired('#printQrCode'),
    printCanonicalUrl: queryRequired('#printCanonicalUrl'),
    qualityGrid: queryRequired('#qualityGrid'),
    qualityAlerts: queryRequired('#qualityAlerts'),
    sectionToggleButtons: queryAll('[data-section-toggle]'),
    backToTopBtn: queryRequired('#backToTopBtn'),
    statusChartHint: queryRequired('#statusChartHint'),
    modalidadeChartHint: queryRequired('#modalidadeChartHint'),
    modalidadeCountChartHint: queryRequired('#modalidadeCountChartHint'),
    dueMonthChartHint: queryRequired('#dueMonthChartHint'),
    companyValueChartHint: queryRequired('#companyValueChartHint'),
    companyCountChartHint: queryRequired('#companyCountChartHint'),
    deadlineChartHint: queryRequired('#deadlineChartHint'),
    qualityChartHint: queryRequired('#qualityChartHint'),
    contractDialog: queryRequired('#contractDialog'),
    contractDialogEyebrow: queryRequired('#contractDialogEyebrow'),
    contractDialogTitle: queryRequired('#contractDialogTitle'),
    contractDialogBody: queryRequired('#contractDialogBody'),
    contractDialogCloseBtn: queryRequired('#contractDialogCloseBtn'),
    copyContractBtn: queryRequired('#copyContractBtn'),
    printContractBtn: queryRequired('#printContractBtn'),
    shareContractBtn: queryRequired('#shareContractBtn'),
    shortcutsDialog: queryRequired('#shortcutsDialog'),
    shortcutsDialogCloseBtn: queryRequired('#shortcutsDialogCloseBtn'),
    timelineSvg: queryRequired('#timelineSvg'),
    timelineTable: queryRequired('#timelineTable'),
    timelineHint: queryRequired('#timelineHint'),
    timelinePrevBtn: queryRequired('#timelinePrevBtn'),
    timelineNextBtn: queryRequired('#timelineNextBtn'),
    timelinePageLabel: queryRequired('#timelinePageLabel'),
    timelineExportBtn: queryRequired('#timelineExportBtn'),
    heatmapSvg: queryRequired('#heatmapSvg'),
    heatmapTable: queryRequired('#heatmapTable'),
    heatmapExportBtn: queryRequired('#heatmapExportBtn'),
    companyTreemapSvg: queryRequired('#companyTreemapSvg'),
    companyTreemapTable: queryRequired('#companyTreemapTable'),
    treemapExportBtn: queryRequired('#treemapExportBtn'),
    comparisonSvg: queryRequired('#comparisonSvg'),
    comparisonExportBtn: queryRequired('#comparisonExportBtn'),
    managerComparisonTable: queryRequired('#managerComparisonTable'),
    fiscalComparisonTable: queryRequired('#fiscalComparisonTable'),
    comparisonSortButtons: queryAll('[data-comparison-sort]'),
  };
}

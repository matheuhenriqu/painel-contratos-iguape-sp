const SELECT_ALL = "todos";
const TABLE_COLUMN_COUNT = 11;
const MS_PER_DAY = 86_400_000;
const RENDER_DEBOUNCE_MS = 120;
const BREAKPOINTS = {
  small: 720,
  filters: 820,
};
const STORAGE_KEYS = {
  compactRows: "contratosIguapeCompactRows",
};
const URL_PARAM_KEYS = {
  search: "busca",
  status: "status",
  modalidade: "modalidade",
  gestor: "gestor",
  fiscal: "fiscal",
  prazo: "prazo",
  ano: "ano",
  sortKey: "ordem",
  sortDir: "direcao",
  compactRows: "compacto",
};
const SORT_KEYS = new Set(["id", "contrato", "processo", "objeto", "empresa", "modalidade", "valor", "dataVencimento", "status", "gestor", "fiscal"]);
const COMPLETED_STATUS_SLUGS = new Set(["concluido", "finalizado"]);
const CLOSED_STATUS_SLUGS = new Set(["encerrado", "fracassado", "nao assinou", "suspenso"]);
const INSUFFICIENT_STATUS_SLUGS = new Set(["indefinido", "sem informacao", "sem status"]);
const FIELD_FALLBACKS = {
  contrato: "Sem contrato informado",
  processo: "Sem processo informado",
  objeto: "Sem objeto informado",
  empresa: "Sem empresa informada",
  modalidade: "Sem modalidade informada",
  gestor: "Sem gestor informado",
  fiscal: "Sem fiscal informado",
  valor: "Sem valor informado",
  dataVencimento: "Sem data de vencimento",
  status: "Sem status informado",
  informacao: "Sem informação suficiente",
};
const QUALITY_FIELDS = [
  { key: "gestor", label: "Sem gestor", issue: "gestor não informado" },
  { key: "fiscal", label: "Sem fiscal", issue: "fiscal não informado" },
  { key: "dataVencimento", label: "Sem vencimento", issue: "data de vencimento não informada" },
  { key: "valor", label: "Sem valor", issue: "valor não informado ou zerado" },
  { key: "empresa", label: "Sem empresa", issue: "empresa não informada" },
];
const collator = new Intl.Collator("pt-BR", {
  numeric: true,
  sensitivity: "base",
});

const sourceData = normalizeSourceData(window.CONTRATOS_DATA);
const defaultSort = {
  key: "dataVencimento",
  dir: "asc",
};
const pageSize = {
  desktop: 80,
  mobile: 18,
};

const state = {
  search: "",
  status: SELECT_ALL,
  modalidade: SELECT_ALL,
  gestor: SELECT_ALL,
  fiscal: SELECT_ALL,
  prazo: SELECT_ALL,
  ano: SELECT_ALL,
  sortKey: defaultSort.key,
  sortDir: defaultSort.dir,
  visibleLimit: pageSize.desktop,
  compactRows: false,
};

const charts = {};
const chartSignatures = {};
const viewState = {
  filteredRows: [],
  currentRows: [],
  expiredRows: [],
  completedRows: [],
  metrics: null,
  summaryText: "",
};
let userToggledFilters = false;
let searchRenderTimer = null;
let scrollTicking = false;
let actionFeedbackTimer = null;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("pt-BR");
const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });
const elements = {
  updatedLabel: queryRequired("#updatedLabel"),
  filters: queryRequired(".filters"),
  toggleFiltersBtn: queryRequired("#toggleFiltersBtn"),
  filterToggleLabel: queryRequired("#filterToggleLabel"),
  quickFilterButtons: queryAll("[data-quick-filter]"),
  filterCountBadge: queryRequired("#filterCountBadge"),
  kpiGrid: queryRequired("#kpiGrid"),
  insightGrid: queryRequired("#insightGrid"),
  statusFilter: queryRequired("#statusFilter"),
  modalidadeFilter: queryRequired("#modalidadeFilter"),
  gestorFilter: queryRequired("#gestorFilter"),
  fiscalFilter: queryRequired("#fiscalFilter"),
  prazoFilter: queryRequired("#prazoFilter"),
  anoFilter: queryRequired("#anoFilter"),
  searchInput: queryRequired("#searchInput"),
  clearSearchBtn: queryRequired("#clearSearchBtn"),
  clearFiltersBtn: queryRequired("#clearFiltersBtn"),
  table: queryRequired("#contractsTable"),
  tableCount: queryRequired("#tableCount"),
  tablePager: queryRequired("#tablePager"),
  expiredTable: queryRequired("#expiredContractsTable"),
  expiredTableCount: queryRequired("#expiredTableCount"),
  completedTable: queryRequired("#completedContractsTable"),
  completedTableCount: queryRequired("#completedTableCount"),
  activeFilters: queryRequired("#activeFilters"),
  sortField: queryRequired("#sortField"),
  sortDirBtn: queryRequired("#sortDirBtn"),
  sortDirLabel: queryRequired("#sortDirLabel"),
  densityBtn: queryRequired("#densityBtn"),
  densityLabel: queryRequired("#densityLabel"),
  resultSummary: queryRequired("#resultSummary"),
  autoSummary: queryRequired("#autoSummary"),
  actionFeedback: queryRequired("#actionFeedback"),
  copySummaryBtn: queryRequired("#copySummaryBtn"),
  exportCsvBtn: queryRequired("#exportCsvBtn"),
  printReportBtn: queryRequired("#printReportBtn"),
  qualityGrid: queryRequired("#qualityGrid"),
  qualityAlerts: queryRequired("#qualityAlerts"),
  sectionToggleButtons: queryAll("[data-section-toggle]"),
  backToTopBtn: queryRequired("#backToTopBtn"),
  statusChartHint: queryRequired("#statusChartHint"),
  modalidadeChartHint: queryRequired("#modalidadeChartHint"),
  modalidadeCountChartHint: queryRequired("#modalidadeCountChartHint"),
  dueMonthChartHint: queryRequired("#dueMonthChartHint"),
  companyValueChartHint: queryRequired("#companyValueChartHint"),
  companyCountChartHint: queryRequired("#companyCountChartHint"),
  deadlineChartHint: queryRequired("#deadlineChartHint"),
  qualityChartHint: queryRequired("#qualityChartHint"),
};

const today = startOfDay(new Date());

const records = sourceData.records.map((record) => {
  const dataVencimento = parseDate(record.dataVencimento);
  const diasAtual = calculateDaysUntil(dataVencimento);
  const businessStatus = classifyContract(record, dataVencimento, diasAtual);
  const display = buildDisplayFields(record, dataVencimento, businessStatus);
  const normalized = buildSearchIndex(record, display, businessStatus);
  return {
    ...record,
    display,
    businessStatus,
    normalized,
    normalizedCompact: compactSearchText(normalized),
    dataVencimentoDate: dataVencimento,
    dataInicioDate: parseDate(record.dataInicio),
    diasAtual,
    prazoBucket: businessStatus.prazoBucket,
    anoVencimento: dataVencimento ? String(dataVencimento.getUTCFullYear()) : FIELD_FALLBACKS.dataVencimento,
    isClosed: businessStatus.group === "closed",
  };
});

function init() {
  resetVisibleLimit();
  hydrateFilters();
  restoreStateFromUrl({ useStoredDensity: true });
  syncFilterInputs();
  applyDensityMode();
  configureFilterPanel();
  bindEvents();
  render();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function hydrateFilters() {
  fillSelect(elements.statusFilter, "Todos", unique(records.map((item) => item.businessStatus.label)));
  fillSelect(elements.modalidadeFilter, "Todas", unique(records.map((item) => item.display.modalidade)));
  fillSelect(elements.gestorFilter, "Todos", unique(records.map((item) => item.display.gestor)));
  fillSelect(elements.fiscalFilter, "Todos", unique(records.map((item) => item.display.fiscal)));
  const years = unique(records.map((item) => item.anoVencimento)).sort((a, b) => {
    if (a === FIELD_FALLBACKS.dataVencimento) return 1;
    if (b === FIELD_FALLBACKS.dataVencimento) return -1;
    return Number(a) - Number(b);
  });
  fillSelect(elements.anoFilter, "Todos", years);

  const dataUpdatedAt = sourceData.updatedAt || sourceData.generatedAt;
  elements.updatedLabel.textContent = `Atualizado: ${formatUpdatedAt(dataUpdatedAt)} · ${numberFormat.format(records.length)} contratos`;
  elements.updatedLabel.title = `Última atualização dos dados: ${formatUpdatedAt(dataUpdatedAt, true)}`;
}

function bindEvents() {
  elements.toggleFiltersBtn.addEventListener("click", () => {
    if (!isFilterViewport()) {
      setFiltersCollapsed(false);
      return;
    }
    userToggledFilters = true;
    setFiltersCollapsed(!elements.filters.classList.contains("is-collapsed"));
  });

  addMediaChangeListener(window.matchMedia(`(max-width: ${BREAKPOINTS.filters}px)`), (event) => {
    if (!event.matches) {
      userToggledFilters = false;
      setFiltersCollapsed(false);
      return;
    }
    if (!userToggledFilters) setFiltersCollapsed(true);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = normalizeText(event.target.value);
    resetVisibleLimit();
    updateSearchClearButton();
    updateFilterControls();
    queueRender();
  });

  elements.clearSearchBtn.addEventListener("click", () => {
    state.search = "";
    elements.searchInput.value = "";
    resetVisibleLimit();
    updateSearchClearButton();
    render();
    elements.searchInput.focus();
  });

  elements.quickFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyQuickFilter(button.dataset.quickFilter);
    });
  });

  [
    ["status", elements.statusFilter],
    ["modalidade", elements.modalidadeFilter],
    ["gestor", elements.gestorFilter],
    ["fiscal", elements.fiscalFilter],
    ["prazo", elements.prazoFilter],
    ["ano", elements.anoFilter],
  ].forEach(([key, element]) => {
    element.addEventListener("change", (event) => {
      state[key] = event.target.value;
      resetVisibleLimit();
      render();
    });
  });

  elements.sortField.addEventListener("change", (event) => {
    state.sortKey = event.target.value;
    state.sortDir = state.sortKey === "valor" ? "desc" : "asc";
    resetVisibleLimit();
    render();
  });

  elements.sortDirBtn.addEventListener("click", () => {
    state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
    resetVisibleLimit();
    render();
  });

  elements.densityBtn.addEventListener("click", () => {
    state.compactRows = !state.compactRows;
    storeCompactRows(state.compactRows);
    applyDensityMode();
    updateUrlFromState();
  });

  elements.copySummaryBtn.addEventListener("click", copyCurrentSummary);
  elements.exportCsvBtn.addEventListener("click", exportFilteredCsv);
  elements.printReportBtn.addEventListener("click", () => {
    showActionFeedback("Preparando relatório para impressão.");
    window.print();
  });

  elements.activeFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-clear-filter]");
    if (!button) return;
    clearSingleFilter(button.dataset.clearFilter);
  });

  elements.tablePager.addEventListener("click", (event) => {
    const button = event.target.closest("[data-page-action]");
    if (!button) return;
    if (button.dataset.pageAction === "all") {
      state.visibleLimit = Number.MAX_SAFE_INTEGER;
    } else {
      state.visibleLimit += getPageSize();
    }
    render();
  });

  elements.clearFiltersBtn.addEventListener("click", () => {
    Object.assign(state, {
      search: "",
      status: SELECT_ALL,
      modalidade: SELECT_ALL,
      gestor: SELECT_ALL,
      fiscal: SELECT_ALL,
      prazo: SELECT_ALL,
      ano: SELECT_ALL,
      sortKey: defaultSort.key,
      sortDir: defaultSort.dir,
    });
    resetVisibleLimit();
    elements.searchInput.value = "";
    elements.statusFilter.value = SELECT_ALL;
    elements.modalidadeFilter.value = SELECT_ALL;
    elements.gestorFilter.value = SELECT_ALL;
    elements.fiscalFilter.value = SELECT_ALL;
    elements.prazoFilter.value = SELECT_ALL;
    elements.anoFilter.value = SELECT_ALL;
    updateSearchClearButton();
    render();
  });

  elements.sectionToggleButtons.forEach((button) => {
    button.addEventListener("click", () => toggleSection(button));
  });

  elements.backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: isReducedMotion() ? "auto" : "smooth" });
  });

  window.addEventListener("scroll", scheduleBackToTopUpdate, { passive: true });
  window.addEventListener("popstate", () => {
    restoreStateFromUrl({ useStoredDensity: false });
    syncFilterInputs();
    applyDensityMode();
    resetVisibleLimit();
    render({ syncUrl: false });
  });

  queryAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "valor" ? "desc" : "asc";
      }
      resetVisibleLimit();
      render();
    });
  });
}

function render(options = {}) {
  const filtered = getFilteredRows();
  const currentRows = sortRows(filtered.filter(isCurrentContract));
  const expiredRows = sortRows(filtered.filter(isExpiredContract));
  const completedRows = sortRows(filtered.filter(isCompletedContract));
  const metrics = buildDashboardMetrics(filtered, currentRows, expiredRows, completedRows);
  updateViewState(filtered, currentRows, expiredRows, completedRows, metrics);
  renderKpis(metrics);
  renderInsights(filtered, metrics);
  renderQuality(metrics);
  renderAutoSummary(metrics);
  renderCharts(filtered, metrics);
  renderQuickFilterIndicators();
  renderActiveFilters();
  renderResultSummary(metrics);
  updateFilterControls();
  updateActionControls(filtered.length);
  renderTable(currentRows);
  renderSectionTable(elements.expiredTable, elements.expiredTableCount, expiredRows, "vencido(s)", "Nenhum contrato vencido no recorte atual.");
  renderSectionTable(elements.completedTable, elements.completedTableCount, completedRows, "encerrado(s)/concluído(s)", "Nenhum contrato encerrado ou concluído no recorte atual.");
  renderSortIndicators();
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
  if (window.lucide) {
    window.lucide.createIcons();
  }
  if (options.syncUrl !== false) updateUrlFromState();
}

function getFilteredRows() {
  const searchTerms = getSearchTerms(state.search);
  return records.filter((item) => {
    if (searchTerms.length && !matchesSearchTerms(item, searchTerms)) return false;
    if (state.status !== SELECT_ALL && item.businessStatus.label !== state.status) return false;
    if (state.modalidade !== SELECT_ALL && item.display.modalidade !== state.modalidade) return false;
    if (state.gestor !== SELECT_ALL && item.display.gestor !== state.gestor) return false;
    if (state.fiscal !== SELECT_ALL && item.display.fiscal !== state.fiscal) return false;
    if (state.prazo !== SELECT_ALL && !matchesPrazoFilter(item)) return false;
    if (state.ano !== SELECT_ALL && item.anoVencimento !== state.ano) return false;
    return true;
  });
}

function updateViewState(filteredRows, currentRows, expiredRows, completedRows, metrics) {
  viewState.filteredRows = filteredRows;
  viewState.currentRows = currentRows;
  viewState.expiredRows = expiredRows;
  viewState.completedRows = completedRows;
  viewState.metrics = metrics;
}

function buildDashboardMetrics(rows, currentRows, expiredRows, completedRows) {
  const quality = getDataQualityMetrics(rows);
  const due30 = rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 30).length;
  const due90 = rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 90).length;
  const nearDue = rows.filter((item) => item.businessStatus.key === "vence-hoje" || item.businessStatus.key === "proximo-de-vencer").length;

  return {
    rows,
    totalContracts: records.length,
    filteredContracts: rows.length,
    totalValue: sum(records, "valor"),
    filteredValue: sum(rows, "valor"),
    currentCount: currentRows.length,
    expiredCount: expiredRows.length,
    closedCount: completedRows.length,
    vigenteCount: rows.filter((item) => item.businessStatus.key === "vigente").length,
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

function renderKpis(metrics) {
  const cards = [
    { label: "Total de contratos", value: numberFormat.format(metrics.filteredContracts), note: `${numberFormat.format(metrics.totalContracts)} na base`, icon: "file-text", color: "green" },
    { label: "Valor da base", value: compactCurrency(metrics.totalValue), note: formatCurrency(metrics.totalValue), icon: "landmark", color: "teal" },
    { label: "Valor filtrado", value: compactCurrency(metrics.filteredValue), note: formatCurrency(metrics.filteredValue), icon: "wallet", color: "teal" },
    { label: "Vigentes", value: numberFormat.format(metrics.vigenteCount), note: "prazo acima de 90 dias", icon: "check-circle-2", color: "green" },
    { label: "Vencidos", value: numberFormat.format(metrics.expiredCount), note: "prazo expirado e aberto", icon: "circle-alert", color: "red" },
    { label: "Próx. vencer", value: numberFormat.format(metrics.nearDue), note: "vence hoje ou em até 7 dias", icon: "alarm-clock", color: "amber" },
    { label: "Até 30 dias", value: numberFormat.format(metrics.due30), note: "contratos abertos", icon: "clock-3", color: "amber" },
    { label: "Até 90 dias", value: numberFormat.format(metrics.due90), note: "inclui vencimentos até 30 dias", icon: "calendar-clock", color: "plum" },
    { label: "Encerr./concl.", value: numberFormat.format(metrics.closedCount), note: "não entram como vencidos", icon: "archive", color: "plum" },
    { label: "Sem gestor", value: numberFormat.format(metrics.withoutManager), note: formatPercent(metrics.withoutManager, metrics.filteredContracts), icon: "user-round-x", color: "red" },
    { label: "Sem fiscal", value: numberFormat.format(metrics.withoutFiscal), note: formatPercent(metrics.withoutFiscal, metrics.filteredContracts), icon: "badge-alert", color: "red" },
    { label: "Sem vencimento", value: numberFormat.format(metrics.withoutDueDate), note: formatPercent(metrics.withoutDueDate, metrics.filteredContracts), icon: "calendar-x", color: "amber" },
    { label: "Sem valor", value: numberFormat.format(metrics.withoutValue), note: "ausente ou zerado", icon: "badge-dollar-sign", color: "amber" },
    { label: "Sem empresa", value: numberFormat.format(metrics.withoutCompany), note: formatPercent(metrics.withoutCompany, metrics.filteredContracts), icon: "building-2", color: "plum" },
    { label: "Atualização", value: formatShortUpdatedAt(metrics.updatedAt), note: `${numberFormat.format(metrics.filteredContracts)} no recorte`, icon: "database", color: "green" },
  ];

  setSafeHtml(elements.kpiGrid, cards.map((card) => `
    <article class="kpi-card">
      <span class="kpi-icon ${escapeAttr(card.color)}" aria-hidden="true"><i aria-hidden="true" data-lucide="${escapeAttr(card.icon)}"></i></span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small>${escapeHtml(card.note)}</small>
      </div>
    </article>
  `).join(""));
}

function renderInsights(rows, metrics) {
  const openRows = rows.filter((item) => !item.isClosed);
  const nextDue = sortByDueDateAsc(openRows.filter((item) => item.dataVencimentoDate && item.diasAtual !== null && item.diasAtual >= 0))[0];
  const highestValue = [...rows].sort((a, b) => (toFiniteNumber(b.valor) || 0) - (toFiniteNumber(a.valor) || 0))[0];
  const missingResponsibles = rows.filter((item) => item.display.isMissing.gestor || item.display.isMissing.fiscal);
  const expiredRows = rows.filter((item) => item.businessStatus.key === "vencido");
  const expiredValue = sum(expiredRows, "valor");

  const cards = [
    {
      label: "Próximo vencimento",
      value: nextDue ? formatDate(nextDue.dataVencimentoDate) : FIELD_FALLBACKS.dataVencimento,
      note: nextDue ? `${nextDue.display.objeto} · ${formatDays(nextDue.diasAtual)}` : "Nenhum contrato aberto no recorte",
      icon: "calendar-clock",
      tone: "amber",
    },
    {
      label: "Maior contrato",
      value: highestValue ? compactCurrency(highestValue.valor) : "R$ 0",
      note: highestValue ? `${highestValue.display.objeto} · ${highestValue.display.empresa}` : "Sem contratos no recorte",
      icon: "badge-dollar-sign",
      tone: "blue",
    },
    {
      label: "Sem gestor/fiscal",
      value: numberFormat.format(missingResponsibles.length),
      note: `${formatPercent(missingResponsibles.length, metrics.filteredContracts)} do recorte atual`,
      icon: "user-round-x",
      tone: "plum",
    },
    {
      label: "Valor vencido",
      value: compactCurrency(expiredValue),
      note: `${numberFormat.format(expiredRows.length)} contrato(s) não encerrado(s)`,
      icon: "shield-alert",
      tone: "red",
    },
  ];

  setSafeHtml(elements.insightGrid, cards.map((card) => `
    <article class="insight-card ${escapeAttr(card.tone)}">
      <span class="insight-icon" aria-hidden="true"><i aria-hidden="true" data-lucide="${escapeAttr(card.icon)}"></i></span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small title="${escapeAttr(card.note)}">${escapeHtml(card.note)}</small>
      </div>
    </article>
  `).join(""));
}

function renderQuality(metrics) {
  const cards = [
    { key: "gestor", label: "Sem gestor", icon: "user-round-x" },
    { key: "fiscal", label: "Sem fiscal", icon: "badge-alert" },
    { key: "dataVencimento", label: "Sem vencimento", icon: "calendar-x" },
    { key: "valor", label: "Sem valor", icon: "badge-dollar-sign" },
    { key: "incomplete", label: "Registros incompletos", icon: "clipboard-x" },
  ];

  setSafeHtml(elements.qualityGrid, cards.map((card) => {
    const count = card.key === "incomplete" ? metrics.quality.incompleteCount : metrics.quality.counts[card.key];
    const note = card.key === "incomplete" ? "com pelo menos uma pendência" : "do recorte atual";
    return `
      <article class="quality-card">
        <span class="quality-icon" aria-hidden="true"><i aria-hidden="true" data-lucide="${escapeAttr(card.icon)}"></i></span>
        <div>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(formatPercent(count, metrics.filteredContracts))}</strong>
          <small>${escapeHtml(numberFormat.format(count))} contrato(s) ${escapeHtml(note)}</small>
        </div>
      </article>
    `;
  }).join(""));

  const alerts = getQualityAlerts(metrics);
  setSafeHtml(elements.qualityAlerts, alerts.map((alert) => `
    <p class="quality-alert ${escapeAttr(alert.tone)}">
      <i aria-hidden="true" data-lucide="${escapeAttr(alert.icon)}"></i>
      <span>${escapeHtml(alert.text)}</span>
    </p>
  `).join(""));
}

function renderAutoSummary(metrics) {
  const summary = buildTextSummary(metrics);
  viewState.summaryText = summary;
  elements.autoSummary.textContent = summary;
}

function renderCharts(rows, metrics) {
  if (!window.Chart) return;

  const statusData = countBy(rows, (item) => item.businessStatus.label);
  elements.statusChartHint.textContent = `${statusData.labels.length} status visíveis`;
  renderChart("statusChart", "statusChartEmpty", {
    type: "doughnut",
    data: {
      labels: statusData.labels,
      datasets: [{ data: statusData.values, backgroundColor: chartColors(statusData.labels.length), borderWidth: 2, borderColor: "#fff" }],
    },
    options: doughnutOptions(),
  }, rows.length > 0 && statusData.labels.length > 0);

  const modalidadeData = sumBy(rows, (item) => item.display.modalidade, (item) => item.valor)
    .slice(0, 8);
  elements.modalidadeChartHint.textContent = `${modalidadeData.length} modalidades com maior valor`;
  renderChart("modalidadeChart", "modalidadeChartEmpty", {
    type: "bar",
    data: {
      labels: modalidadeData.map((item) => item.label),
      datasets: [{ label: "Valor", data: modalidadeData.map((item) => item.value), backgroundColor: "#24715d", borderRadius: 6 }],
    },
    options: horizontalBarOptions(true),
  }, modalidadeData.some((item) => item.value > 0));

  const modalidadeCountMap = countBy(rows, (item) => item.display.modalidade);
  const modalidadeCountData = modalidadeCountMap.labels
    .map((label, index) => ({ label, value: modalidadeCountMap.values[index] }))
    .slice(0, 8);
  elements.modalidadeCountChartHint.textContent = `${modalidadeCountData.length} modalidades com maior quantidade`;
  renderChart("modalidadeCountChart", "modalidadeCountChartEmpty", {
    type: "bar",
    data: {
      labels: modalidadeCountData.map((item) => item.label),
      datasets: [{ label: "Contratos", data: modalidadeCountData.map((item) => item.value), backgroundColor: "#266485", borderRadius: 6 }],
    },
    options: horizontalBarOptions(false),
  }, modalidadeCountData.length > 0);

  const dueMonthData = getDueMonthData(rows);
  elements.dueMonthChartHint.textContent = `${dueMonthData.length} mês(es) com vencimento`;
  renderChart("dueMonthChart", "dueMonthChartEmpty", {
    type: "bar",
    data: {
      labels: dueMonthData.map((item) => item.label),
      datasets: [{ label: "Vencimentos", data: dueMonthData.map((item) => item.value), backgroundColor: "#bd7619", borderRadius: 6 }],
    },
    options: verticalBarOptions(false),
  }, dueMonthData.length > 0);

  const companyValueData = sumBy(rows, (item) => item.display.empresa, (item) => item.valor).slice(0, 8);
  elements.companyValueChartHint.textContent = `${companyValueData.length} empresas com maior valor`;
  renderChart("companyValueChart", "companyValueChartEmpty", {
    type: "bar",
    data: {
      labels: companyValueData.map((item) => item.label),
      datasets: [{ label: "Valor", data: companyValueData.map((item) => item.value), backgroundColor: "#16837a", borderRadius: 6 }],
    },
    options: horizontalBarOptions(true),
  }, companyValueData.some((item) => item.value > 0));

  const companyCountMap = countBy(rows, (item) => item.display.empresa);
  const companyCountData = companyCountMap.labels.map((label, index) => ({ label, value: companyCountMap.values[index] })).slice(0, 8);
  elements.companyCountChartHint.textContent = `${companyCountData.length} empresas com mais contratos`;
  renderChart("companyCountChart", "companyCountChartEmpty", {
    type: "bar",
    data: {
      labels: companyCountData.map((item) => item.label),
      datasets: [{ label: "Contratos", data: companyCountData.map((item) => item.value), backgroundColor: "#70578e", borderRadius: 6 }],
    },
    options: horizontalBarOptions(false),
  }, companyCountData.length > 0);

  const deadlineData = getDeadlineDistribution(rows);
  elements.deadlineChartHint.textContent = `${deadlineData.length} faixas de prazo`;
  renderChart("deadlineChart", "deadlineChartEmpty", {
    type: "doughnut",
    data: {
      labels: deadlineData.map((item) => item.label),
      datasets: [{ data: deadlineData.map((item) => item.value), backgroundColor: deadlineData.map((item) => item.color), borderWidth: 2, borderColor: "#fff" }],
    },
    options: doughnutOptions(),
  }, deadlineData.length > 0);

  const qualityChartData = QUALITY_FIELDS.map((field) => ({
    label: field.label,
    value: metrics.quality.counts[field.key],
  }));
  elements.qualityChartHint.textContent = `${numberFormat.format(metrics.quality.incompleteCount)} registro(s) incompleto(s)`;
  renderChart("qualityChart", "qualityChartEmpty", {
    type: "bar",
    data: {
      labels: qualityChartData.map((item) => item.label),
      datasets: [{ label: "Contratos", data: qualityChartData.map((item) => item.value), backgroundColor: "#a86613", borderRadius: 6 }],
    },
    options: verticalBarOptions(false),
  }, metrics.filteredContracts > 0);
}

function getDataQualityMetrics(rows) {
  const counts = {
    gestor: rows.filter((item) => item.display.isMissing.gestor).length,
    fiscal: rows.filter((item) => item.display.isMissing.fiscal).length,
    dataVencimento: rows.filter((item) => item.display.isMissing.dataVencimento).length,
    valor: rows.filter(hasMissingContractValue).length,
    empresa: rows.filter((item) => item.display.isMissing.empresa).length,
  };
  const incompleteCount = rows.filter(hasIncompleteRegistration).length;
  const percentages = Object.fromEntries(Object.entries(counts).map(([key, value]) => [key, getPercent(value, rows.length)]));

  return {
    total: rows.length,
    counts,
    percentages,
    incompleteCount,
    incompletePercent: getPercent(incompleteCount, rows.length),
  };
}

function hasIncompleteRegistration(item) {
  return item.display.isMissing.contrato
    || item.display.isMissing.processo
    || item.display.isMissing.objeto
    || item.display.isMissing.empresa
    || item.display.isMissing.modalidade
    || item.display.isMissing.gestor
    || item.display.isMissing.fiscal
    || item.display.isMissing.dataVencimento
    || hasMissingContractValue(item);
}

function getQualityAlerts(metrics) {
  if (!metrics.filteredContracts) {
    return [{ tone: "neutral", icon: "info", text: "Nenhum contrato encontrado no recorte atual para avaliar qualidade cadastral." }];
  }

  const alerts = QUALITY_FIELDS
    .map((field) => ({
      tone: metrics.quality.counts[field.key] ? "warning" : "ok",
      icon: metrics.quality.counts[field.key] ? "triangle-alert" : "circle-check",
      text: metrics.quality.counts[field.key]
        ? `${numberFormat.format(metrics.quality.counts[field.key])} contrato(s) com ${field.issue} (${formatPercent(metrics.quality.counts[field.key], metrics.filteredContracts)}).`
        : `Nenhum contrato com ${field.issue} no recorte atual.`,
      count: metrics.quality.counts[field.key],
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  if (metrics.quality.incompleteCount > 0) {
    alerts.unshift({
      tone: "warning",
      icon: "clipboard-x",
      text: `${numberFormat.format(metrics.quality.incompleteCount)} registro(s) com pelo menos uma pendência cadastral no recorte atual.`,
      count: metrics.quality.incompleteCount,
    });
  }

  return alerts;
}

function buildTextSummary(metrics) {
  const filterText = getActiveFilterCount() ? ` Filtros ativos: ${formatActiveFiltersForSummary()}.` : " Sem filtros ativos.";
  if (!metrics.filteredContracts) {
    return `Nenhum contrato foi encontrado no recorte atual. Última atualização da base: ${formatUpdatedAt(metrics.updatedAt, true)}.${filterText}`;
  }

  const qualityText = metrics.quality.incompleteCount
    ? ` Há ${numberFormat.format(metrics.quality.incompleteCount)} registro(s) incompleto(s), com destaque para ${numberFormat.format(metrics.withoutFiscal)} sem fiscal e ${numberFormat.format(metrics.withoutManager)} sem gestor.`
    : " Não há pendências cadastrais no recorte atual.";

  return [
    `O recorte atual contém ${numberFormat.format(metrics.filteredContracts)} contrato(s), somando ${formatCurrency(metrics.filteredValue)}.`,
    `${numberFormat.format(metrics.currentCount)} estão em acompanhamento, ${numberFormat.format(metrics.expiredCount)} estão vencidos e ${numberFormat.format(metrics.closedCount)} estão encerrados ou concluídos.`,
    `${numberFormat.format(metrics.due30)} contrato(s) vencem em até 30 dias e ${numberFormat.format(metrics.due90)} vencem em até 90 dias.`,
    qualityText,
    `Última atualização da base: ${formatUpdatedAt(metrics.updatedAt, true)}.`,
    filterText,
  ].join(" ");
}

function formatActiveFiltersForSummary() {
  const filters = [];
  if (state.search) filters.push(`busca "${elements.searchInput.value.trim()}"`);
  if (state.status !== SELECT_ALL) filters.push(`status ${state.status}`);
  if (state.prazo !== SELECT_ALL) filters.push(`prazo ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`);
  if (state.modalidade !== SELECT_ALL) filters.push(`modalidade ${state.modalidade}`);
  if (state.gestor !== SELECT_ALL) filters.push(`gestor ${state.gestor}`);
  if (state.fiscal !== SELECT_ALL) filters.push(`fiscal ${state.fiscal}`);
  if (state.ano !== SELECT_ALL) filters.push(`ano ${state.ano}`);
  return filters.join("; ");
}

function getDueMonthData(rows) {
  const map = new Map();
  rows.forEach((item) => {
    if (!item.dataVencimentoDate) return;
    const key = `${item.dataVencimentoDate.getUTCFullYear()}-${String(item.dataVencimentoDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const label = capitalizeFirst(monthFormat.format(item.dataVencimentoDate).replace(".", ""));
    const current = map.get(key) || { key, label, value: 0 };
    current.value += 1;
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(0, 12);
}

function getDeadlineDistribution(rows) {
  const buckets = [
    { key: "vencido", label: "Vencidos", color: "#b7443e" },
    { key: "hoje", label: "Vence hoje", color: "#d35f1f" },
    { key: "30", label: "Até 30 dias", color: "#bd7619" },
    { key: "90", label: "31 a 90 dias", color: "#2f6f9f" },
    { key: "futuro", label: "Mais de 90 dias", color: "#24715d" },
    { key: "sem-data", label: "Sem vencimento", color: "#70578e" },
  ];
  return buckets
    .map((bucket) => ({
      ...bucket,
      value: rows.filter((item) => item.businessStatus.prazoBucket === bucket.key).length,
    }))
    .filter((item) => item.value > 0);
}

function renderChart(canvasId, emptyId, config, hasData) {
  const canvas = document.getElementById(canvasId);
  const empty = document.getElementById(emptyId);
  if (!canvas) return;

  if (!hasData) {
    if (charts[canvasId]) {
      charts[canvasId].destroy();
      delete charts[canvasId];
      delete chartSignatures[canvasId];
    }
    canvas.hidden = true;
    canvas.setAttribute("aria-hidden", "true");
    if (empty) empty.hidden = false;
    return;
  }

  canvas.hidden = false;
  canvas.removeAttribute("aria-hidden");
  if (empty) empty.hidden = true;
  upsertChart(canvasId, config);
}

function renderActiveFilters() {
  const chipData = [];
  if (state.search) chipData.push({ key: "search", label: `Busca: ${elements.searchInput.value}` });
  if (state.status !== SELECT_ALL) chipData.push({ key: "status", label: `Status: ${state.status}` });
  if (state.prazo !== SELECT_ALL) chipData.push({ key: "prazo", label: `Prazo: ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}` });
  if (state.modalidade !== SELECT_ALL) chipData.push({ key: "modalidade", label: `Modalidade: ${state.modalidade}` });
  if (state.gestor !== SELECT_ALL) chipData.push({ key: "gestor", label: `Gestor: ${state.gestor}` });
  if (state.fiscal !== SELECT_ALL) chipData.push({ key: "fiscal", label: `Fiscal: ${state.fiscal}` });
  if (state.ano !== SELECT_ALL) chipData.push({ key: "ano", label: `Ano: ${state.ano}` });

  if (!chipData.length) {
    setSafeHtml(elements.activeFilters, '<span class="sr-only">Nenhum filtro ativo</span>');
    return;
  }

  setSafeHtml(elements.activeFilters, chipData.map((chip) => `
    <button class="filter-chip" type="button" data-clear-filter="${escapeAttr(chip.key)}" aria-label="Remover filtro ${escapeAttr(chip.label)}">
      <span>${escapeHtml(chip.label)}</span>
      <i aria-hidden="true" data-lucide="x"></i>
    </button>
  `).join(""));
}

function renderResultSummary(metrics) {
  const prefix = getActiveFilterCount() ? "resultado(s) encontrado(s)" : "contrato(s) na base";
  elements.resultSummary.textContent = [
    `${numberFormat.format(metrics.filteredContracts)} ${prefix}`,
    `${numberFormat.format(metrics.currentCount)} em acompanhamento`,
    `${numberFormat.format(metrics.expiredCount)} vencido(s)`,
    `${numberFormat.format(metrics.closedCount)} encerrado(s)/concluído(s)`,
  ].join(" · ");
}

function updateFilterControls() {
  const count = getActiveFilterCount();
  elements.filterCountBadge.hidden = count === 0;
  elements.filterCountBadge.textContent = count ? numberFormat.format(count) : "";
  elements.clearFiltersBtn.disabled = !hasActiveAdjustments();
}

function updateActionControls(rowCount) {
  elements.exportCsvBtn.disabled = rowCount === 0;
  elements.copySummaryBtn.disabled = !viewState.summaryText;
}

async function copyCurrentSummary() {
  const text = viewState.summaryText || buildTextSummary(viewState.metrics);
  const ok = await writeClipboard(text);
  showActionFeedback(ok ? "Resumo copiado para a área de transferência." : "Não foi possível copiar automaticamente.");
}

function exportFilteredCsv() {
  const rows = getRowsForExport();
  if (!rows.length) {
    showActionFeedback("Não há contratos para exportar neste recorte.");
    return;
  }

  const csv = buildCsv(rows);
  const filename = `contratos-iguape-recorte-${formatFileDate(new Date())}.csv`;
  downloadTextFile(filename, csv, "text/csv;charset=utf-8");
  showActionFeedback(`${numberFormat.format(rows.length)} contrato(s) exportado(s) em CSV.`);
}

function getRowsForExport() {
  return [...viewState.currentRows, ...viewState.expiredRows, ...viewState.completedRows];
}

function buildCsv(rows) {
  const columns = [
    ["id", "ID"],
    ["contrato", "Contrato"],
    ["processo", "Processo"],
    ["objeto", "Objeto"],
    ["empresa", "Empresa"],
    ["modalidade", "Modalidade"],
    ["valor", "Valor numérico"],
    ["valorFormatado", "Valor"],
    ["dataVencimento", "Data de vencimento"],
    ["diasAtual", "Dias até o vencimento"],
    ["statusPainel", "Status do painel"],
    ["statusPlanilha", "Status da planilha"],
    ["gestor", "Gestor"],
    ["fiscal", "Fiscal"],
    ["observacoes", "Observações"],
  ];

  const header = columns.map(([, label]) => csvValue(label)).join(",");
  const body = rows.map((item) => columns.map(([key]) => csvValue(getCsvField(item, key))).join(","));
  return [header, ...body].join("\r\n");
}

function getCsvField(item, key) {
  const values = {
    id: item.id ?? "",
    contrato: item.display.contrato,
    processo: item.display.processo,
    objeto: item.display.objeto,
    empresa: item.display.empresa,
    modalidade: item.display.modalidade,
    valor: toFiniteNumber(item.valor) ?? "",
    valorFormatado: item.display.valor,
    dataVencimento: item.dataVencimento || FIELD_FALLBACKS.dataVencimento,
    diasAtual: item.diasAtual ?? "",
    statusPainel: item.businessStatus.label,
    statusPlanilha: item.display.statusSource,
    gestor: item.display.gestor,
    fiscal: item.display.fiscal,
    observacoes: getFieldText(item.observacoes, ""),
  };
  return values[key] ?? "";
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, "\"\"")}"`;
}

function downloadTextFile(filename, content, type) {
  const blob = new Blob(["\ufeff", content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function writeClipboard(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fallback abaixo.
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.className = "clipboard-buffer";
  document.body.append(textarea);
  textarea.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  textarea.remove();
  return ok;
}

function showActionFeedback(message) {
  window.clearTimeout(actionFeedbackTimer);
  elements.actionFeedback.textContent = message;
  actionFeedbackTimer = window.setTimeout(() => {
    elements.actionFeedback.textContent = "";
  }, 3200);
}

function getActiveFilterCount() {
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

function hasActiveAdjustments() {
  return getActiveFilterCount() > 0 || state.sortKey !== defaultSort.key || state.sortDir !== defaultSort.dir;
}

function applyQuickFilter(filter) {
  const values = {
    status: SELECT_ALL,
    prazo: SELECT_ALL,
  };

  if (filter === "ativos") values.status = "Vigente";
  if (filter === "vencidos") values.prazo = "vencido";
  if (filter === "30") values.prazo = "30";

  state.status = values.status;
  state.prazo = values.prazo;
  elements.statusFilter.value = values.status;
  elements.prazoFilter.value = values.prazo;
  resetVisibleLimit();
  render();
}

function renderQuickFilterIndicators() {
  const current = getCurrentQuickFilter();
  elements.quickFilterButtons.forEach((button) => {
    const active = button.dataset.quickFilter === current;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function getCurrentQuickFilter() {
  if (state.status === "Vigente" && state.prazo === SELECT_ALL) return "ativos";
  if (state.status === SELECT_ALL && state.prazo === "vencido") return "vencidos";
  if (state.status === SELECT_ALL && state.prazo === "30") return "30";
  if (state.status === SELECT_ALL && state.prazo === SELECT_ALL) return SELECT_ALL;
  return "";
}

function matchesPrazoFilter(item) {
  if (item.isClosed) return false;
  return item.businessStatus.prazoBucket === state.prazo;
}

function renderTable(rows) {
  const visibleRows = rows.slice(0, state.visibleLimit);
  const shown = visibleRows.length;
  elements.tableCount.textContent = formatTableCount(shown, rows.length, "em acompanhamento");

  if (!rows.length) {
    setSafeHtml(elements.table, renderEmptyRow("Nenhum contrato encontrado."));
    clearElement(elements.tablePager);
    return;
  }

  setSafeHtml(elements.table, renderRows(visibleRows));
  renderTablePager(rows.length, shown);
}

function renderSectionTable(table, countElement, rows, label, emptyMessage) {
  countElement.textContent = `${numberFormat.format(rows.length)} contrato(s) ${label} no recorte atual`;

  if (!rows.length) {
    setSafeHtml(table, renderEmptyRow(emptyMessage));
    return;
  }

  setSafeHtml(table, renderRows(rows));
}

function renderRows(rows) {
  return rows.map((item) => `
    <tr class="${escapeAttr(rowClassNames(item))}" aria-label="${escapeAttr(getRowSummary(item))}">
      <td data-label="ID">${escapeHtml(item.id ?? "")}</td>
      <td data-label="Contrato" class="${escapeAttr(fieldCellClass(item, "contrato"))}"><span class="reference-code">${escapeHtml(item.display.contrato)}</span></td>
      <td data-label="Processo" class="${escapeAttr(fieldCellClass(item, "processo"))}"><span class="reference-code">${escapeHtml(item.display.processo)}</span></td>
      <td class="object-cell" data-label="Objeto">
        <strong>${escapeHtml(item.display.objeto)}</strong>
      </td>
      <td data-label="Empresa" class="${escapeAttr(fieldCellClass(item, "empresa"))}">${escapeHtml(item.display.empresa)}</td>
      <td data-label="Modalidade" class="${escapeAttr(fieldCellClass(item, "modalidade"))}">${escapeHtml(item.display.modalidade)}</td>
      <td class="money-cell ${escapeAttr(fieldCellClass(item, "valor"))}" data-label="Valor">${escapeHtml(item.display.valor)}</td>
      <td class="date-cell ${escapeAttr(fieldCellClass(item, "dataVencimento"))}" data-label="Vencimento">
        ${escapeHtml(item.display.dataVencimento)}
        <br><span class="timing-pill ${escapeAttr(timingClass(item))}">${escapeHtml(item.businessStatus.timingLabel)}</span>
      </td>
      <td data-label="Status" class="status-cell">${renderStatusCell(item)}</td>
      <td data-label="Gestor" class="${escapeAttr(fieldCellClass(item, "gestor"))}">${escapeHtml(item.display.gestor)}</td>
      <td data-label="Fiscal" class="${escapeAttr(fieldCellClass(item, "fiscal"))}">${escapeHtml(item.display.fiscal)}</td>
    </tr>
  `).join("");
}

function renderStatusCell(item) {
  const source = item.businessStatus.sourceLabel && normalizeText(item.businessStatus.sourceLabel) !== normalizeText(item.businessStatus.label)
    ? `<small>Planilha: ${escapeHtml(item.businessStatus.sourceLabel)}</small>`
    : "";

  return `
    <span class="status-badge ${escapeAttr(statusClass(item.businessStatus.key))}">${escapeHtml(item.businessStatus.label)}</span>
    ${source}
  `;
}

function rowClassNames(item) {
  return [
    item.businessStatus.rowClass,
    item.display.isMissing.gestor ? "row-missing-gestor" : "",
    item.display.isMissing.fiscal ? "row-missing-fiscal" : "",
  ].filter(Boolean).join(" ");
}

function fieldCellClass(item, key) {
  return item.display.isMissing[key] ? "muted missing-field" : "";
}

function getRowSummary(item) {
  return [
    `Contrato ${item.display.contrato}`,
    `processo ${item.display.processo}`,
    item.display.objeto,
    `status ${item.businessStatus.label}`,
    `vencimento ${item.display.dataVencimento}`,
  ].join("; ");
}

function configureFilterPanel() {
  setFiltersCollapsed(isFilterViewport());
}

function setFiltersCollapsed(collapsed) {
  const shouldCollapse = isFilterViewport() && collapsed;
  const label = shouldCollapse ? "Mostrar filtros" : isFilterViewport() ? "Ocultar filtros" : "Filtros";

  elements.filters.classList.toggle("is-collapsed", shouldCollapse);
  elements.toggleFiltersBtn.setAttribute("aria-expanded", String(!shouldCollapse));
  elements.toggleFiltersBtn.setAttribute("aria-label", label);
  elements.filterToggleLabel.textContent = label;
}

function sortRows(rows) {
  const sorted = [...rows];
  const dir = state.sortDir === "asc" ? 1 : -1;
  sorted.sort((a, b) => compareRowsBySort(a, b, state.sortKey, dir));
  return sorted;
}

function compareRowsBySort(a, b, key, dir) {
  const fallback = Number(a.id || 0) - Number(b.id || 0);

  if (key === "dataVencimento") {
    const result = compareNullableValues(a.dataVencimentoDate?.getTime(), b.dataVencimentoDate?.getTime(), (av, bv) => av - bv);
    return result === 0 ? fallback : result * dir;
  }

  if (key === "valor" || key === "id") {
    const result = compareNullableValues(toFiniteNumber(a[key]), toFiniteNumber(b[key]), (av, bv) => av - bv);
    return result === 0 ? fallback : result * dir;
  }

  const result = compareNullableValues(getSortValue(a, key), getSortValue(b, key), (av, bv) => collator.compare(String(av), String(bv)));
  return result === 0 ? fallback : result * dir;
}

function getSortValue(item, key) {
  if (key === "status") return item.businessStatus.label;
  if (key === "modalidade" || key === "gestor" || key === "fiscal") return item.display[key];
  return item[key];
}

function compareNullableValues(a, b, compare) {
  const aMissing = isMissingSortValue(a);
  const bMissing = isMissingSortValue(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;
  return compare(a, b);
}

function isMissingSortValue(value) {
  if (value === null || value === undefined || value === "") return true;
  return typeof value === "number" && Number.isNaN(value);
}

function sortByDueDateAsc(rows) {
  return [...rows].sort(compareDueDateAsc);
}

function compareDueDateAsc(a, b) {
  const aMissing = !a.dataVencimentoDate;
  const bMissing = !b.dataVencimentoDate;
  if (aMissing && bMissing) return Number(a.id || 0) - Number(b.id || 0);
  if (aMissing) return 1;
  if (bMissing) return -1;
  const result = a.dataVencimentoDate.getTime() - b.dataVencimentoDate.getTime();
  return result === 0 ? Number(a.id || 0) - Number(b.id || 0) : result;
}

function renderSortIndicators() {
  queryAll("[data-sort]").forEach((button) => {
    const label = button.dataset.label || button.textContent.trim().replace(/[↑↓]$/, "").trim();
    button.dataset.label = label;
    const active = button.dataset.sort === state.sortKey;
    const direction = state.sortDir === "asc" ? "ascending" : "descending";
    const headerCell = button.closest("th");
    button.classList.toggle("is-sorted", active);
    button.textContent = active ? `${label} ${state.sortDir === "asc" ? "↑" : "↓"}` : label;
    button.setAttribute("aria-label", active ? `Ordenar por ${label}, atualmente ${state.sortDir === "asc" ? "crescente" : "decrescente"}` : `Ordenar por ${label}`);
    button.removeAttribute("aria-sort");
    if (headerCell) headerCell.setAttribute("aria-sort", active ? direction : "none");
  });
  syncSortControls();
}

function isCurrentContract(item) {
  return item.businessStatus.group === "current";
}

function isExpiredContract(item) {
  return item.businessStatus.group === "expired";
}

function isCompletedContract(item) {
  return item.businessStatus.group === "closed";
}

function restoreStateFromUrl({ useStoredDensity }) {
  const params = new URLSearchParams(window.location.search);
  const searchText = params.get(URL_PARAM_KEYS.search) || "";

  Object.assign(state, {
    search: normalizeText(searchText),
    status: getAllowedSelectValue(elements.statusFilter, params.get(URL_PARAM_KEYS.status)),
    modalidade: getAllowedSelectValue(elements.modalidadeFilter, params.get(URL_PARAM_KEYS.modalidade)),
    gestor: getAllowedSelectValue(elements.gestorFilter, params.get(URL_PARAM_KEYS.gestor)),
    fiscal: getAllowedSelectValue(elements.fiscalFilter, params.get(URL_PARAM_KEYS.fiscal)),
    prazo: getAllowedSelectValue(elements.prazoFilter, params.get(URL_PARAM_KEYS.prazo)),
    ano: getAllowedSelectValue(elements.anoFilter, params.get(URL_PARAM_KEYS.ano)),
    sortKey: getAllowedSortKey(params.get(URL_PARAM_KEYS.sortKey)),
    sortDir: getAllowedSortDir(params.get(URL_PARAM_KEYS.sortDir)),
    compactRows: getUrlDensityValue(params, useStoredDensity),
  });

  elements.searchInput.value = searchText;
}

function syncFilterInputs() {
  elements.statusFilter.value = state.status;
  elements.modalidadeFilter.value = state.modalidade;
  elements.gestorFilter.value = state.gestor;
  elements.fiscalFilter.value = state.fiscal;
  elements.prazoFilter.value = state.prazo;
  elements.anoFilter.value = state.ano;
  updateSearchClearButton();
  syncSortControls();
  updateFilterControls();
}

function getAllowedSelectValue(select, value) {
  if (!value) return SELECT_ALL;
  return [...select.options].some((option) => option.value === value) ? value : SELECT_ALL;
}

function getAllowedSortKey(value) {
  return SORT_KEYS.has(value) ? value : defaultSort.key;
}

function getAllowedSortDir(value) {
  return value === "asc" || value === "desc" ? value : defaultSort.dir;
}

function getUrlDensityValue(params, useStoredDensity) {
  const value = params.get(URL_PARAM_KEYS.compactRows);
  if (value === "1") return true;
  if (value === "0") return false;
  return useStoredDensity ? getStoredCompactRows() : false;
}

function updateUrlFromState() {
  const params = new URLSearchParams();
  const searchText = elements.searchInput.value.trim();

  if (searchText) params.set(URL_PARAM_KEYS.search, searchText);
  setFilterParam(params, URL_PARAM_KEYS.status, state.status);
  setFilterParam(params, URL_PARAM_KEYS.modalidade, state.modalidade);
  setFilterParam(params, URL_PARAM_KEYS.gestor, state.gestor);
  setFilterParam(params, URL_PARAM_KEYS.fiscal, state.fiscal);
  setFilterParam(params, URL_PARAM_KEYS.prazo, state.prazo);
  setFilterParam(params, URL_PARAM_KEYS.ano, state.ano);
  if (state.sortKey !== defaultSort.key) params.set(URL_PARAM_KEYS.sortKey, state.sortKey);
  if (state.sortDir !== defaultSort.dir) params.set(URL_PARAM_KEYS.sortDir, state.sortDir);
  if (state.compactRows) params.set(URL_PARAM_KEYS.compactRows, "1");

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    try {
      window.history.replaceState(null, "", nextUrl);
    } catch {
      // A URL continua opcional; a consulta segue funcionando mesmo sem History API.
    }
  }
}

function setFilterParam(params, key, value) {
  if (value !== SELECT_ALL) params.set(key, value);
}

function clearSingleFilter(key) {
  if (key === "search") {
    state.search = "";
    elements.searchInput.value = "";
    updateSearchClearButton();
  } else if (Object.prototype.hasOwnProperty.call(state, key)) {
    state[key] = SELECT_ALL;
    const select = elements[`${key}Filter`];
    if (select) select.value = SELECT_ALL;
  }
  resetVisibleLimit();
  render();
}

function syncSortControls() {
  elements.sortField.value = state.sortKey;
  elements.sortDirLabel.textContent = state.sortDir === "asc" ? "Crescente" : "Decrescente";
  elements.sortDirBtn.classList.toggle("is-desc", state.sortDir === "desc");
}

function renderEmptyRow(message) {
  return `<tr><td colspan="${TABLE_COLUMN_COUNT}" class="empty-state" role="status">${escapeHtml(message)}</td></tr>`;
}

function applyDensityMode() {
  document.body.classList.toggle("is-compact", state.compactRows);
  elements.densityBtn.setAttribute("aria-pressed", String(state.compactRows));
  elements.densityBtn.classList.toggle("is-active", state.compactRows);
  elements.densityBtn.setAttribute("aria-label", state.compactRows ? "Ativar modo confortável" : "Ativar modo compacto");
  elements.densityLabel.textContent = state.compactRows ? "Confortável" : "Compacto";
}

function getStoredCompactRows() {
  try {
    return localStorage.getItem(STORAGE_KEYS.compactRows) === "true";
  } catch {
    return false;
  }
}

function storeCompactRows(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.compactRows, String(value));
  } catch {
    // The view still works when browser storage is unavailable.
  }
}

function formatTableCount(shown, filteredTotal, label = "contratos") {
  const shownText = numberFormat.format(shown);
  const filteredText = numberFormat.format(filteredTotal);
  const totalText = numberFormat.format(records.length);
  if (filteredTotal === records.length) return `Mostrando ${shownText} de ${totalText} ${label}`;
  return `Mostrando ${shownText} de ${filteredText} ${label} · ${totalText} contratos na base`;
}

function renderTablePager(total, shown) {
  if (shown >= total) {
    clearElement(elements.tablePager);
    return;
  }

  const remaining = total - shown;
  setSafeHtml(elements.tablePager, `
    <span>${numberFormat.format(remaining)} contrato(s) restantes</span>
    <div>
      <button class="pager-button" type="button" data-page-action="more">
        <i aria-hidden="true" data-lucide="chevrons-down"></i>
        <span>Mostrar mais</span>
      </button>
      <button class="pager-button" type="button" data-page-action="all">
        <i aria-hidden="true" data-lucide="list"></i>
        <span>Mostrar todos</span>
      </button>
    </div>
  `);
}

function resetVisibleLimit() {
  state.visibleLimit = getPageSize();
}

function getPageSize() {
  return isSmallViewport() ? pageSize.mobile : pageSize.desktop;
}

function normalizeSourceData(data) {
  if (!data || !Array.isArray(data.records)) {
    return { records: [], generatedAt: null };
  }
  return data;
}

function buildDisplayFields(record, dataVencimento, businessStatus) {
  return {
    contrato: getFieldText(record.contrato, FIELD_FALLBACKS.contrato),
    processo: getFieldText(record.processo, FIELD_FALLBACKS.processo),
    objeto: getFieldText(record.objeto, FIELD_FALLBACKS.objeto),
    empresa: getFieldText(record.empresa, FIELD_FALLBACKS.empresa),
    modalidade: getFieldText(record.modalidade, FIELD_FALLBACKS.modalidade),
    gestor: getFieldText(record.gestor, FIELD_FALLBACKS.gestor),
    fiscal: getFieldText(record.fiscal, FIELD_FALLBACKS.fiscal),
    valor: formatContractValue(record.valor),
    dataVencimento: formatDate(dataVencimento),
    statusSource: getFieldText(record.status, FIELD_FALLBACKS.status),
    status: businessStatus.label,
    isMissing: {
      contrato: isBlank(record.contrato),
      processo: isBlank(record.processo),
      objeto: isBlank(record.objeto),
      empresa: isBlank(record.empresa),
      modalidade: isBlank(record.modalidade),
      gestor: isBlank(record.gestor),
      fiscal: isBlank(record.fiscal),
      valor: hasMissingContractValue(record),
      dataVencimento: !dataVencimento,
      status: isBlank(record.status),
    },
  };
}

function classifyContract(record, dataVencimento, diasAtual) {
  const sourceLabel = getFieldText(record.status, FIELD_FALLBACKS.status);
  const statusSlug = normalizeText(record.status);

  if (COMPLETED_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: "concluido",
      label: "Concluído",
      sourceLabel,
      group: "closed",
      prazoBucket: "concluido",
      rowClass: "row-closed",
      tone: "closed",
      timingLabel: "Contrato concluído",
    };
  }

  if (CLOSED_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: "encerrado",
      label: "Encerrado",
      sourceLabel,
      group: "closed",
      prazoBucket: "encerrado",
      rowClass: "row-closed",
      tone: "closed",
      timingLabel: "Contrato encerrado",
    };
  }

  if (INSUFFICIENT_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: "sem-informacao",
      label: FIELD_FALLBACKS.informacao,
      sourceLabel,
      group: "current",
      prazoBucket: "insuficiente",
      rowClass: "row-insufficient",
      tone: "neutral",
      timingLabel: FIELD_FALLBACKS.informacao,
    };
  }

  if (!dataVencimento || diasAtual === null) {
    return {
      key: "sem-data",
      label: FIELD_FALLBACKS.dataVencimento,
      sourceLabel,
      group: "current",
      prazoBucket: "sem-data",
      rowClass: "row-no-date",
      tone: "neutral",
      timingLabel: FIELD_FALLBACKS.dataVencimento,
    };
  }

  if (diasAtual < 0) {
    return {
      key: "vencido",
      label: "Vencido",
      sourceLabel,
      group: "expired",
      prazoBucket: "vencido",
      rowClass: "row-expired",
      tone: "danger",
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual === 0) {
    return {
      key: "vence-hoje",
      label: "Vence hoje",
      sourceLabel,
      group: "current",
      prazoBucket: "hoje",
      rowClass: "row-due-today",
      tone: "warning",
      timingLabel: "vence hoje",
    };
  }

  if (diasAtual <= 7) {
    return {
      key: "proximo-de-vencer",
      label: "Próximo de vencer",
      sourceLabel,
      group: "current",
      prazoBucket: "30",
      rowClass: "row-due-soon",
      tone: "warning",
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual <= 30) {
    return {
      key: "vence-ate-30",
      label: "Vence em até 30 dias",
      sourceLabel,
      group: "current",
      prazoBucket: "30",
      rowClass: "row-due-soon",
      tone: "warning",
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual <= 90) {
    return {
      key: "vence-31-90",
      label: "Vence entre 31 e 90 dias",
      sourceLabel,
      group: "current",
      prazoBucket: "90",
      rowClass: "row-due-mid",
      tone: "notice",
      timingLabel: formatDays(diasAtual),
    };
  }

  return {
    key: "vigente",
    label: "Vigente",
    sourceLabel,
    group: "current",
    prazoBucket: "futuro",
    rowClass: "row-current",
    tone: "ok",
    timingLabel: formatDays(diasAtual),
  };
}

function buildSearchIndex(record, display, businessStatus) {
  return normalizeText([
    display.objeto,
    display.empresa,
    display.contrato,
    display.processo,
    display.modalidade,
    display.gestor,
    display.fiscal,
    display.status,
    record.numeroModalidade,
    record.observacoes,
    record.status,
    businessStatus.label,
  ].join(" "));
}

function getFieldText(value, fallback) {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function isBlank(value) {
  return String(value ?? "").trim() === "";
}

function queryRequired(selector) {
  const element = document.querySelector(selector);
  if (!element) {
    throw new Error(`Elemento obrigatório não encontrado: ${selector}`);
  }
  return element;
}

function queryAll(selector) {
  return [...document.querySelectorAll(selector)];
}

function addMediaChangeListener(mediaQuery, listener) {
  if (typeof mediaQuery.addEventListener === "function") {
    mediaQuery.addEventListener("change", listener);
    return;
  }
  mediaQuery.addListener(listener);
}

function fillSelect(select, allLabel, options) {
  const fragment = document.createDocumentFragment();
  fragment.append(createOption(SELECT_ALL, allLabel));
  options.forEach((option) => {
    fragment.append(createOption(option, option));
  });
  select.replaceChildren(fragment);
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = String(value);
  option.textContent = String(label);
  return option;
}

function setSafeHtml(element, html) {
  // Use only with templates whose dynamic data was passed through escapeHtml/escapeAttr.
  element.innerHTML = html;
}

function clearElement(element) {
  element.replaceChildren();
}

function unique(values) {
  return [...new Set(values.map((value) => value || "").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function compactSearchText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function getSearchTerms(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

function matchesSearchTerms(item, terms) {
  return terms.every((term) => {
    const compactTerm = compactSearchText(term);
    return item.normalized.includes(term) || Boolean(compactTerm && item.normalizedCompact.includes(compactTerm));
  });
}

function parseDate(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function startOfDay(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function calculateDaysUntil(date, baseDate = today) {
  if (!date) return null;
  return Math.ceil((date - baseDate) / MS_PER_DAY);
}

function formatDate(date, fallback = FIELD_FALLBACKS.dataVencimento) {
  return date ? dateFormat.format(date) : fallback;
}

function formatUpdatedAt(value, withSeconds = false) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
  });
}

function formatShortUpdatedAt(value) {
  if (!value) return "Sem data";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sem data";
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

function formatDays(days) {
  if (days === null || Number.isNaN(days)) return FIELD_FALLBACKS.dataVencimento;
  if (days < 0) return `vencido há ${formatDayCount(Math.abs(days))}`;
  if (days === 0) return "vence hoje";
  return `vence em ${formatDayCount(days)}`;
}

function formatContractTiming(item) {
  return item.businessStatus.timingLabel;
}

function formatDayCount(days) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

function deadlineRowClass(item) {
  return item.businessStatus.rowClass;
}

function timingClass(item) {
  return `timing-${item.businessStatus.tone}`;
}

function statusClass(status) {
  const slug = slugifyClassName(status);
  return `status-${slug || "sem-status"}`;
}

function slugifyClassName(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sum(rows, key) {
  return rows.reduce((total, item) => total + (toFiniteNumber(item[key]) || 0), 0);
}

function countBy(rows, accessor) {
  const map = new Map();
  rows.forEach((item) => {
    const label = accessor(item) || "Sem informação";
    map.set(label, (map.get(label) || 0) + 1);
  });
  const entries = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  return {
    labels: entries.map(([label]) => label),
    values: entries.map(([, value]) => value),
  };
}

function sumBy(rows, labelAccessor, valueAccessor) {
  const map = new Map();
  rows.forEach((item) => {
    const label = labelAccessor(item) || "Sem informação";
    map.set(label, (map.get(label) || 0) + (toFiniteNumber(valueAccessor(item)) || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function compactCurrency(value, fallback = FIELD_FALLBACKS.valor) {
  const amount = toFiniteNumber(value);
  if (amount === null) return fallback;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const digits = abs >= 100_000_000 ? 0 : 1;
    return `R$ ${(amount / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: digits })} mi`;
  }
  if (abs >= 1_000) return `R$ ${(amount / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return currency.format(amount);
}

function formatCurrency(value, fallback = FIELD_FALLBACKS.valor) {
  const amount = toFiniteNumber(value);
  return amount === null ? fallback : currency.format(amount);
}

function formatContractValue(value) {
  return hasMissingContractValue(value) ? FIELD_FALLBACKS.valor : formatCurrency(value);
}

function hasMissingContractValue(itemOrValue) {
  const value = typeof itemOrValue === "object" && itemOrValue !== null ? itemOrValue.valor : itemOrValue;
  const amount = toFiniteNumber(value);
  return amount === null || amount <= 0;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getPercent(count, total) {
  return total > 0 ? (count / total) * 100 : 0;
}

function formatPercent(count, total) {
  return `${getPercent(count, total).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function formatFileDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function capitalizeFirst(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

function isSmallViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.small}px)`).matches;
}

function isFilterViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINTS.filters}px)`).matches;
}

function shortLabel(label, length = 22) {
  const text = String(label || "");
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function chartColors(length) {
  const palette = ["#24715d", "#bd7619", "#b7443e", "#70578e", "#16837a", "#2f6f9f", "#7b6d40", "#9c5a4f", "#4e7d3a", "#7f678d"];
  return Array.from({ length }, (_, index) => palette[index % palette.length]);
}

function upsertChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const signature = getChartSignature(config);

  if (charts[id] && chartSignatures[id] === signature) return;

  if (charts[id] && charts[id].config.type === config.type) {
    charts[id].data = config.data;
    charts[id].options = config.options;
    charts[id].update(isReducedMotion() ? "none" : undefined);
  } else {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, config);
  }
  chartSignatures[id] = signature;
}

function getChartSignature(config) {
  return JSON.stringify({
    type: config.type,
    data: config.data,
    small: isSmallViewport(),
    reducedMotion: isReducedMotion(),
  });
}

function commonPlugins() {
  const small = isSmallViewport();
  return {
    legend: {
      position: "bottom",
      labels: {
        boxWidth: 10,
        boxHeight: 10,
        padding: small ? 10 : 14,
        usePointStyle: true,
        font: { size: small ? 10 : 12 },
      },
    },
    tooltip: {
      backgroundColor: "#172621",
      titleColor: "#ffffff",
      bodyColor: "#ffffff",
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label(context) {
          const label = context.dataset.label || context.label || "";
          const value = context.parsed?.x ?? context.parsed?.y ?? context.parsed ?? 0;
          return label === "Valor" ? `${label}: ${currency.format(value)}` : `${label}: ${numberFormat.format(value)}`;
        },
      },
    },
  };
}

function doughnutOptions() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "62%",
    plugins: commonPlugins(),
    animation: chartAnimation(),
  };
}

function horizontalBarOptions(currencyAxis = false) {
  const small = isSmallViewport();
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(),
    animation: chartAnimation(),
    scales: {
      x: {
        ticks: {
          callback: (value) => currencyAxis ? compactCurrency(Number(value)) : numberFormat.format(value),
        },
        grid: { color: "#edf1ed" },
      },
      y: {
        ticks: {
          callback(value) {
            return shortLabel(this.getLabelForValue(value), small ? 18 : 28);
          },
        },
        grid: { display: false },
      },
    },
  };
}

function verticalBarOptions(currencyAxis = false) {
  const small = isSmallViewport();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(),
    animation: chartAnimation(),
    scales: {
      x: {
        ticks: {
          maxRotation: small ? 45 : 0,
          autoSkip: true,
          callback(value) {
            return shortLabel(this.getLabelForValue(value), small ? 12 : 18);
          },
        },
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          callback: (value) => currencyAxis ? compactCurrency(Number(value)) : numberFormat.format(value),
        },
        grid: { color: "#edf1ed" },
      },
    },
  };
}

function chartAnimation() {
  return isReducedMotion() ? false : { duration: 650, easing: "easeOutQuart" };
}

function queueRender() {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, RENDER_DEBOUNCE_MS);
}

function updateSearchClearButton() {
  elements.clearSearchBtn.hidden = !elements.searchInput.value;
}

function toggleSection(button) {
  const section = button.closest("[data-collapsible-section]");
  const content = document.getElementById(button.getAttribute("aria-controls"));
  if (!section || !content) return;
  const collapsed = section.classList.toggle("is-section-collapsed");
  content.hidden = collapsed;
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", `${collapsed ? "Expandir" : "Recolher"} ${section.querySelector("h2")?.textContent || "seção"}`);
}

function scheduleBackToTopUpdate() {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateBackToTopButton();
    scrollTicking = false;
  });
}

function updateBackToTopButton() {
  elements.backToTopBtn.hidden = window.scrollY < Math.max(520, window.innerHeight * 0.75);
}

function isReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

document.addEventListener("DOMContentLoaded", init);

const SELECT_ALL = "todos";
const TABLE_COLUMN_COUNT = 11;
const MS_PER_DAY = 86_400_000;
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
let userToggledFilters = false;
let searchRenderTimer = null;
let scrollTicking = false;

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("pt-BR");
const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
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
  sectionToggleButtons: queryAll("[data-section-toggle]"),
  backToTopBtn: queryRequired("#backToTopBtn"),
  statusChartHint: queryRequired("#statusChartHint"),
  modalidadeChartHint: queryRequired("#modalidadeChartHint"),
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
  renderKpis(filtered);
  renderInsights(filtered);
  renderCharts(filtered);
  renderQuickFilterIndicators();
  renderActiveFilters();
  renderResultSummary(filtered.length, currentRows.length, expiredRows.length, completedRows.length);
  updateFilterControls();
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

function renderKpis(rows) {
  const totalValue = sum(rows, "valor");
  const activeCount = rows.filter((item) => item.businessStatus.key === "vigente").length;
  const vencidos = rows.filter((item) => item.businessStatus.key === "vencido").length;
  const vence30 = rows.filter((item) => item.businessStatus.prazoBucket === "30").length;
  const semResponsavel = rows.filter((item) => item.display.isMissing.gestor || item.display.isMissing.fiscal).length;

  const cards = [
    { label: "Contratos", value: numberFormat.format(rows.length), note: `${numberFormat.format(records.length)} na base`, icon: "file-text", color: "green" },
    { label: "Valor total", value: compactCurrency(totalValue), note: formatCurrency(totalValue), icon: "wallet", color: "teal" },
    { label: "Vigentes", value: numberFormat.format(activeCount), note: "prazo regular acima de 90 dias", icon: "check-circle-2", color: "plum" },
    { label: "Vencidos", value: numberFormat.format(vencidos), note: "contratos não encerrados", icon: "circle-alert", color: "red" },
    { label: "Até 30 dias", value: numberFormat.format(vence30), note: `${numberFormat.format(semResponsavel)} sem gestor/fiscal`, icon: "clock-3", color: "amber" },
  ];

  elements.kpiGrid.innerHTML = cards.map((card) => `
    <article class="kpi-card">
      <span class="kpi-icon ${escapeAttr(card.color)}" aria-hidden="true"><i data-lucide="${escapeAttr(card.icon)}"></i></span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small>${escapeHtml(card.note)}</small>
      </div>
    </article>
  `).join("");
}

function renderInsights(rows) {
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
      note: "cadastro incompleto no recorte atual",
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

  elements.insightGrid.innerHTML = cards.map((card) => `
    <article class="insight-card ${escapeAttr(card.tone)}">
      <span class="insight-icon" aria-hidden="true"><i data-lucide="${escapeAttr(card.icon)}"></i></span>
      <div>
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small title="${escapeHtml(card.note)}">${escapeHtml(card.note)}</small>
      </div>
    </article>
  `).join("");
}

function renderCharts(rows) {
  if (!window.Chart) return;

  const statusData = countBy(rows, (item) => item.businessStatus.label);
  elements.statusChartHint.textContent = `${statusData.labels.length} status visíveis`;
  upsertChart("statusChart", {
    type: "doughnut",
    data: {
      labels: statusData.labels,
      datasets: [{ data: statusData.values, backgroundColor: chartColors(statusData.labels.length), borderWidth: 2, borderColor: "#fff" }],
    },
    options: doughnutOptions(),
  });

  const modalidadeData = sumBy(rows, (item) => item.display.modalidade, (item) => item.valor)
    .slice(0, 8);
  elements.modalidadeChartHint.textContent = `${modalidadeData.length} modalidades com maior valor`;
  upsertChart("modalidadeChart", {
    type: "bar",
    data: {
      labels: modalidadeData.map((item) => item.label),
      datasets: [{ label: "Valor", data: modalidadeData.map((item) => item.value), backgroundColor: "#24715d", borderRadius: 6 }],
    },
    options: horizontalBarOptions(true),
  });
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

  elements.activeFilters.innerHTML = chipData.map((chip) => `
    <button class="filter-chip" type="button" data-clear-filter="${chip.key}" aria-label="Remover filtro ${escapeAttr(chip.label)}">
      <span>${escapeHtml(chip.label)}</span>
      <i data-lucide="x"></i>
    </button>
  `).join("");
}

function renderResultSummary(filteredTotal, currentTotal, expiredTotal, completedTotal) {
  const prefix = getActiveFilterCount() ? "resultado(s) encontrado(s)" : "contrato(s) na base";
  elements.resultSummary.textContent = [
    `${numberFormat.format(filteredTotal)} ${prefix}`,
    `${numberFormat.format(currentTotal)} em acompanhamento`,
    `${numberFormat.format(expiredTotal)} vencido(s)`,
    `${numberFormat.format(completedTotal)} encerrado(s)/concluído(s)`,
  ].join(" · ");
}

function updateFilterControls() {
  const count = getActiveFilterCount();
  elements.filterCountBadge.hidden = count === 0;
  elements.filterCountBadge.textContent = count ? numberFormat.format(count) : "";
  elements.clearFiltersBtn.disabled = !hasActiveAdjustments();
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
    elements.table.innerHTML = renderEmptyRow("Nenhum contrato encontrado.");
    elements.tablePager.innerHTML = "";
    return;
  }

  elements.table.innerHTML = renderRows(visibleRows);
  renderTablePager(rows.length, shown);
}

function renderSectionTable(table, countElement, rows, label, emptyMessage) {
  countElement.textContent = `${numberFormat.format(rows.length)} contrato(s) ${label} no recorte atual`;

  if (!rows.length) {
    table.innerHTML = renderEmptyRow(emptyMessage);
    return;
  }

  table.innerHTML = renderRows(rows);
}

function renderRows(rows) {
  return rows.map((item) => `
    <tr class="${escapeAttr(rowClassNames(item))}">
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
  return `<tr><td colspan="${TABLE_COLUMN_COUNT}" class="empty-state">${escapeHtml(message)}</td></tr>`;
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
    elements.tablePager.innerHTML = "";
    return;
  }

  const remaining = total - shown;
  elements.tablePager.innerHTML = `
    <span>${numberFormat.format(remaining)} contrato(s) restantes</span>
    <div>
      <button class="pager-button" type="button" data-page-action="more">
        <i data-lucide="chevrons-down"></i>
        <span>Mostrar mais</span>
      </button>
      <button class="pager-button" type="button" data-page-action="all">
        <i data-lucide="list"></i>
        <span>Mostrar todos</span>
      </button>
    </div>
  `;
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
    valor: formatCurrency(record.valor),
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
      valor: toFiniteNumber(record.valor) === null,
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
  select.innerHTML = [`<option value="${SELECT_ALL}">${escapeHtml(allLabel)}</option>`]
    .concat(options.map((option) => `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`))
    .join("");
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

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
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
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, config);
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

function chartAnimation() {
  return isReducedMotion() ? false : { duration: 650, easing: "easeOutQuart" };
}

function queueRender() {
  window.clearTimeout(searchRenderTimer);
  searchRenderTimer = window.setTimeout(render, 120);
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

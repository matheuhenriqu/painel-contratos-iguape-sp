const sourceData = window.CONTRATOS_DATA || { records: [], generatedAt: null };
const defaultSort = {
  key: "dataVencimento",
  dir: "asc",
};

const state = {
  search: "",
  status: "todos",
  modalidade: "todos",
  gestor: "todos",
  fiscal: "todos",
  prazo: "todos",
  ano: "todos",
  sortKey: defaultSort.key,
  sortDir: defaultSort.dir,
};

const charts = {};
let userToggledFilters = false;
const closedStatuses = new Set(["encerrado", "finalizado", "fracassado", "nao assinou", "suspenso"]);

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

const numberFormat = new Intl.NumberFormat("pt-BR");
const dateFormat = new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" });

const elements = {
  updatedLabel: document.querySelector("#updatedLabel"),
  filters: document.querySelector(".filters"),
  toggleFiltersBtn: document.querySelector("#toggleFiltersBtn"),
  quickFilterButtons: [...document.querySelectorAll("[data-quick-filter]")],
  sectionFilterButtons: [...document.querySelectorAll("[data-section-filter]")],
  kpiGrid: document.querySelector("#kpiGrid"),
  insightGrid: document.querySelector("#insightGrid"),
  statusFilter: document.querySelector("#statusFilter"),
  modalidadeFilter: document.querySelector("#modalidadeFilter"),
  gestorFilter: document.querySelector("#gestorFilter"),
  fiscalFilter: document.querySelector("#fiscalFilter"),
  prazoFilter: document.querySelector("#prazoFilter"),
  anoFilter: document.querySelector("#anoFilter"),
  searchInput: document.querySelector("#searchInput"),
  clearFiltersBtn: document.querySelector("#clearFiltersBtn"),
  table: document.querySelector("#contractsTable"),
  tableCount: document.querySelector("#tableCount"),
  activeFilters: document.querySelector("#activeFilters"),
  criticalList: document.querySelector("#criticalList"),
  criticalHint: document.querySelector("#criticalHint"),
  responsaveisList: document.querySelector("#responsaveisList"),
  responsaveisHint: document.querySelector("#responsaveisHint"),
  activeContractsList: document.querySelector("#activeContractsList"),
  activeContractsHint: document.querySelector("#activeContractsHint"),
  expiredContractsList: document.querySelector("#expiredContractsList"),
  expiredContractsHint: document.querySelector("#expiredContractsHint"),
  statusChartHint: document.querySelector("#statusChartHint"),
  modalidadeChartHint: document.querySelector("#modalidadeChartHint"),
  vencimentosChartHint: document.querySelector("#vencimentosChartHint"),
};

const today = startOfDay(new Date());

const records = sourceData.records.map((record) => {
  const dataVencimento = parseDate(record.dataVencimento);
  const diasAtual = dataVencimento ? Math.ceil((dataVencimento - today) / 86400000) : null;
  return {
    ...record,
    normalized: normalizeText([
      record.objeto,
      record.empresa,
      record.contrato,
      record.processo,
      record.modalidade,
      record.gestor,
      record.fiscal,
      record.observacoes,
    ].join(" ")),
    dataVencimentoDate: dataVencimento,
    dataInicioDate: parseDate(record.dataInicio),
    diasAtual,
    prazoBucket: getPrazoBucket(diasAtual),
    anoVencimento: dataVencimento ? String(dataVencimento.getUTCFullYear()) : "Sem data",
    isClosed: closedStatuses.has(normalizeText(record.status)),
  };
});

function init() {
  hydrateFilters();
  configureFilterPanel();
  bindEvents();
  render();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function hydrateFilters() {
  fillSelect(elements.statusFilter, "Todos", unique(records.map((item) => item.status || "Sem status")));
  fillSelect(elements.modalidadeFilter, "Todas", unique(records.map((item) => item.modalidade || "Sem modalidade")));
  fillSelect(elements.gestorFilter, "Todos", unique(records.map((item) => item.gestor || "Sem gestor")));
  fillSelect(elements.fiscalFilter, "Todos", unique(records.map((item) => item.fiscal || "Sem fiscal")));
  const years = unique(records.map((item) => item.anoVencimento)).sort((a, b) => {
    if (a === "Sem data") return 1;
    if (b === "Sem data") return -1;
    return Number(a) - Number(b);
  });
  fillSelect(elements.anoFilter, "Todos", years);

  const dataUpdatedAt = sourceData.updatedAt || sourceData.generatedAt;
  elements.updatedLabel.textContent = `Atualizado: ${formatUpdatedAt(dataUpdatedAt)} · ${numberFormat.format(records.length)} contratos`;
  elements.updatedLabel.title = `Última atualização dos dados: ${formatUpdatedAt(dataUpdatedAt, true)}`;
}

function bindEvents() {
  elements.toggleFiltersBtn.addEventListener("click", () => {
    userToggledFilters = true;
    setFiltersCollapsed(!elements.filters.classList.contains("is-collapsed"));
  });

  window.matchMedia("(max-width: 820px)").addEventListener("change", (event) => {
    if (!event.matches) {
      userToggledFilters = false;
      setFiltersCollapsed(false);
      return;
    }
    if (!userToggledFilters) setFiltersCollapsed(true);
  });

  elements.searchInput.addEventListener("input", (event) => {
    state.search = normalizeText(event.target.value);
    render();
  });

  elements.quickFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyQuickFilter(button.dataset.quickFilter);
    });
  });

  elements.sectionFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      applyQuickFilter(button.dataset.sectionFilter);
      document.querySelector(".table-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
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
      render();
    });
  });

  elements.clearFiltersBtn.addEventListener("click", () => {
    Object.assign(state, {
      search: "",
      status: "todos",
      modalidade: "todos",
      gestor: "todos",
      fiscal: "todos",
      prazo: "todos",
      ano: "todos",
      sortKey: defaultSort.key,
      sortDir: defaultSort.dir,
    });
    elements.searchInput.value = "";
    elements.statusFilter.value = "todos";
    elements.modalidadeFilter.value = "todos";
    elements.gestorFilter.value = "todos";
    elements.fiscalFilter.value = "todos";
    elements.prazoFilter.value = "todos";
    elements.anoFilter.value = "todos";
    render();
  });

  document.querySelectorAll("[data-sort]").forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.sort;
      if (state.sortKey === key) {
        state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
      } else {
        state.sortKey = key;
        state.sortDir = key === "valor" ? "desc" : "asc";
      }
      render();
    });
  });
}

function render() {
  const filtered = getFilteredRows();
  const sorted = sortRows(filtered);
  renderKpis(filtered);
  renderInsights(filtered);
  renderCharts(filtered);
  renderCritical(filtered);
  renderResponsaveis(filtered);
  renderStatusSections(filtered);
  renderQuickFilterIndicators();
  renderActiveFilters();
  renderTable(sorted);
  renderSortIndicators();
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function getFilteredRows() {
  return records.filter((item) => {
    if (state.search && !item.normalized.includes(state.search)) return false;
    if (state.status !== "todos" && (item.status || "Sem status") !== state.status) return false;
    if (state.modalidade !== "todos" && (item.modalidade || "Sem modalidade") !== state.modalidade) return false;
    if (state.gestor !== "todos" && (item.gestor || "Sem gestor") !== state.gestor) return false;
    if (state.fiscal !== "todos" && (item.fiscal || "Sem fiscal") !== state.fiscal) return false;
    if (state.prazo !== "todos" && !matchesPrazoFilter(item)) return false;
    if (state.ano !== "todos" && item.anoVencimento !== state.ano) return false;
    return true;
  });
}

function renderKpis(rows) {
  const totalValue = sum(rows, "valor");
  const activeCount = rows.filter((item) => normalizeText(item.status) === "ativo").length;
  const vencidos = rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual < 0).length;
  const vence30 = rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual >= 0 && item.diasAtual <= 30).length;
  const semResponsavel = rows.filter((item) => !item.gestor || !item.fiscal).length;

  const cards = [
    { label: "Contratos", value: numberFormat.format(rows.length), note: `${numberFormat.format(records.length)} na base`, icon: "file-text", color: "green" },
    { label: "Valor total", value: compactCurrency(totalValue), note: currency.format(totalValue), icon: "wallet", color: "teal" },
    { label: "Ativos", value: numberFormat.format(activeCount), note: "status cadastral ativo", icon: "check-circle-2", color: "plum" },
    { label: "Vencidos", value: numberFormat.format(vencidos), note: "contratos não encerrados", icon: "circle-alert", color: "red" },
    { label: "Até 30 dias", value: numberFormat.format(vence30), note: `${numberFormat.format(semResponsavel)} sem gestor/fiscal`, icon: "clock-3", color: "amber" },
  ];

  elements.kpiGrid.innerHTML = cards.map((card) => `
    <article class="kpi-card">
      <span class="kpi-icon ${card.color}" aria-hidden="true"><i data-lucide="${card.icon}"></i></span>
      <div>
        <span>${card.label}</span>
        <strong>${card.value}</strong>
        <small>${card.note}</small>
      </div>
    </article>
  `).join("");
}

function renderInsights(rows) {
  const openRows = rows.filter((item) => !item.isClosed);
  const nextDue = sortByDueDateAsc(openRows.filter((item) => item.dataVencimentoDate && item.diasAtual !== null && item.diasAtual >= 0))[0];
  const highestValue = [...rows].sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))[0];
  const missingResponsibles = rows.filter((item) => !item.gestor || !item.fiscal);
  const expiredRows = rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual < 0);
  const expiredValue = sum(expiredRows, "valor");

  const cards = [
    {
      label: "Próximo vencimento",
      value: nextDue ? formatDate(nextDue.dataVencimentoDate) : "Sem prazo",
      note: nextDue ? `${nextDue.objeto || "Sem objeto"} · ${formatDays(nextDue.diasAtual)}` : "Nenhum contrato aberto no recorte",
      icon: "calendar-clock",
      tone: "amber",
    },
    {
      label: "Maior contrato",
      value: highestValue ? compactCurrency(highestValue.valor || 0) : "R$ 0",
      note: highestValue ? `${highestValue.objeto || "Sem objeto"} · ${highestValue.empresa || "Sem empresa"}` : "Sem contratos no recorte",
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
    <article class="insight-card ${card.tone}">
      <span class="insight-icon" aria-hidden="true"><i data-lucide="${card.icon}"></i></span>
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

  const statusData = countBy(rows, (item) => item.status || "Sem status");
  elements.statusChartHint.textContent = `${statusData.labels.length} status visíveis`;
  upsertChart("statusChart", {
    type: "doughnut",
    data: {
      labels: statusData.labels,
      datasets: [{ data: statusData.values, backgroundColor: chartColors(statusData.labels.length), borderWidth: 2, borderColor: "#fff" }],
    },
    options: doughnutOptions(),
  });

  const modalidadeData = sumBy(rows, (item) => item.modalidade || "Sem modalidade", (item) => item.valor)
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

  const vencimentosData = monthlyDeadlines(rows);
  elements.vencimentosChartHint.textContent = `${vencimentosData.total} contratos com data de vencimento`;
  upsertChart("vencimentosChart", {
    type: "bar",
    data: {
      labels: vencimentosData.labels,
      datasets: [
        { label: "Quantidade", data: vencimentosData.counts, backgroundColor: "#16837a", borderRadius: 6, yAxisID: "y" },
        { label: "Valor", data: vencimentosData.values, backgroundColor: "#bd7619", borderRadius: 6, yAxisID: "y1" },
      ],
    },
    options: deadlineOptions(),
  });
}

function renderCritical(rows) {
  const critical = rows
    .filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual <= 30)
    .sort((a, b) => a.diasAtual - b.diasAtual)
    .slice(0, 8);

  elements.criticalHint.textContent = `${numberFormat.format(critical.length)} prioridade(s) no recorte atual`;

  if (!critical.length) {
    elements.criticalList.innerHTML = `<li class="empty-state">Nenhum contrato crítico no recorte atual.</li>`;
    return;
  }

  elements.criticalList.innerHTML = critical.map((item) => {
    const expired = item.diasAtual < 0;
    return `
      <li class="critical-item ${expired ? "expired" : ""}">
        <div>
          <strong title="${escapeHtml(item.objeto || "")}">${escapeHtml(item.objeto || "Sem objeto")}</strong>
          <span>${escapeHtml(item.contrato || "Sem contrato")} · ${escapeHtml(item.empresa || "Sem empresa")}</span>
          <small>${formatDate(item.dataVencimentoDate)} · ${currency.format(item.valor || 0)}</small>
        </div>
        <span class="critical-badge ${expired ? "expired" : ""}">${expired ? `${Math.abs(item.diasAtual)}d vencido` : `${item.diasAtual}d`}</span>
      </li>
    `;
  }).join("");
}

function renderResponsaveis(rows) {
  const semGestor = rows.filter((item) => !item.gestor).length;
  const semFiscal = rows.filter((item) => !item.fiscal).length;
  elements.responsaveisHint.textContent = `${numberFormat.format(semGestor)} sem gestor · ${numberFormat.format(semFiscal)} sem fiscal`;

  const gestorCounts = countBy(rows.filter((item) => item.gestor), (item) => item.gestor);
  const fiscalCounts = countBy(rows.filter((item) => item.fiscal), (item) => item.fiscal);
  const gestores = gestorCounts.labels.map((label, index) => ({ label, value: gestorCounts.values[index] })).slice(0, 5);
  const fiscais = fiscalCounts.labels.map((label, index) => ({ label, value: fiscalCounts.values[index] })).slice(0, 5);

  elements.responsaveisList.innerHTML = `
    ${renderMetricGroup("Gestores", gestores)}
    ${renderMetricGroup("Fiscais", fiscais)}
  `;
}

function renderStatusSections(rows) {
  const activeRows = sortByDueDateAsc(rows.filter((item) => normalizeText(item.status) === "ativo"));
  const expiredRows = sortByDueDateAsc(rows.filter((item) => !item.isClosed && item.diasAtual !== null && item.diasAtual < 0));

  elements.activeContractsHint.textContent = formatSectionHint(activeRows.length, "ativo(s)");
  elements.expiredContractsHint.textContent = formatSectionHint(expiredRows.length, "vencido(s) não encerrado(s)");
  elements.activeContractsList.innerHTML = renderStatusContractList(activeRows, "active");
  elements.expiredContractsList.innerHTML = renderStatusContractList(expiredRows, "expired");
}

function formatSectionHint(count, label) {
  const prefix = `${numberFormat.format(count)} ${label}`;
  return count > 10 ? `${prefix} · 10 primeiros por vencimento` : `${prefix} no recorte atual`;
}

function renderStatusContractList(rows, variant) {
  if (!rows.length) {
    const message = variant === "active"
      ? "Nenhum contrato ativo no recorte atual."
      : "Nenhum contrato vencido no recorte atual.";
    return `<div class="empty-state">${message}</div>`;
  }

  return rows.slice(0, 10).map((item) => `
    <article class="status-contract-card ${variant}">
      <div class="status-contract-main">
        <strong title="${escapeHtml(item.objeto || "")}">${escapeHtml(item.objeto || "Sem objeto")}</strong>
        <span>${escapeHtml(item.contrato || "Sem contrato")} · ${escapeHtml(item.empresa || "Sem empresa")}</span>
      </div>
      <div class="status-contract-meta">
        <span>${formatDate(item.dataVencimentoDate)}</span>
        <span>${currency.format(item.valor || 0)}</span>
        <span>${escapeHtml(item.gestor || "Sem gestor")}</span>
      </div>
      <span class="status-contract-badge ${variant}">
        ${variant === "expired" ? `${Math.abs(item.diasAtual || 0)}d vencido` : formatDays(item.diasAtual)}
      </span>
    </article>
  `).join("");
}

function renderMetricGroup(title, data) {
  if (!data.length) {
    return `<div class="metric-group"><h3>${title}</h3><div class="empty-state">Sem registros no recorte atual.</div></div>`;
  }
  return `
    <div class="metric-group">
      <h3>${title}</h3>
      ${data.map((item) => `
        <div class="metric-row">
          <span>${escapeHtml(item.label)}</span>
          <strong>${numberFormat.format(item.value)}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function renderActiveFilters() {
  const chips = [];
  if (state.search) chips.push(`Busca: ${elements.searchInput.value}`);
  if (state.status !== "todos") chips.push(`Status: ${state.status}`);
  if (state.prazo !== "todos") chips.push(`Prazo: ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`);
  if (state.modalidade !== "todos") chips.push(`Modalidade: ${state.modalidade}`);
  if (state.gestor !== "todos") chips.push(`Gestor: ${state.gestor}`);
  if (state.fiscal !== "todos") chips.push(`Fiscal: ${state.fiscal}`);
  if (state.ano !== "todos") chips.push(`Ano: ${state.ano}`);
  elements.activeFilters.innerHTML = chips.map((chip) => `<span class="filter-chip">${escapeHtml(chip)}</span>`).join("");
}

function applyQuickFilter(filter) {
  const values = {
    status: "todos",
    prazo: "todos",
  };

  if (filter === "ativos") values.status = "Ativo";
  if (filter === "vencidos") values.prazo = "vencido";
  if (filter === "30") values.prazo = "30";

  state.status = values.status;
  state.prazo = values.prazo;
  elements.statusFilter.value = values.status;
  elements.prazoFilter.value = values.prazo;
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
  if (state.status === "Ativo" && state.prazo === "todos") return "ativos";
  if (state.status === "todos" && state.prazo === "vencido") return "vencidos";
  if (state.status === "todos" && state.prazo === "30") return "30";
  if (state.status === "todos" && state.prazo === "todos") return "todos";
  return "";
}

function matchesPrazoFilter(item) {
  if (state.prazo === "sem-data") return item.prazoBucket === "sem-data";
  return !item.isClosed && item.prazoBucket === state.prazo;
}

function renderTable(rows) {
  elements.tableCount.textContent = `Mostrando ${numberFormat.format(rows.length)} de ${numberFormat.format(records.length)} contratos`;

  if (!rows.length) {
    elements.table.innerHTML = `<tr><td colspan="9" class="empty-state">Nenhum contrato encontrado.</td></tr>`;
    return;
  }

  elements.table.innerHTML = rows.map((item) => `
    <tr>
      <td data-label="ID">${escapeHtml(item.id ?? "")}</td>
      <td class="object-cell" data-label="Objeto">
        <strong>${escapeHtml(item.objeto || "Sem objeto")}</strong>
        <span>${escapeHtml(item.contrato || "Sem contrato")} · Processo ${escapeHtml(item.processo || "sem processo")}</span>
      </td>
      <td data-label="Empresa">${escapeHtml(item.empresa || "Sem empresa")}</td>
      <td data-label="Modalidade">${escapeHtml(item.modalidade || "Sem modalidade")}</td>
      <td class="money-cell" data-label="Valor">${currency.format(item.valor || 0)}</td>
      <td class="date-cell" data-label="Vencimento">
        ${formatDate(item.dataVencimentoDate)}
        <br><span class="muted">${formatContractTiming(item)}</span>
      </td>
      <td data-label="Status"><span class="status-badge ${statusClass(item.status)}">${escapeHtml(item.status || "Sem status")}</span></td>
      <td data-label="Gestor" class="${item.gestor ? "" : "muted"}">${escapeHtml(item.gestor || "Sem gestor")}</td>
      <td data-label="Fiscal" class="${item.fiscal ? "" : "muted"}">${escapeHtml(item.fiscal || "Sem fiscal")}</td>
    </tr>
  `).join("");
}

function configureFilterPanel() {
  setFiltersCollapsed(isSmallViewport());
}

function setFiltersCollapsed(collapsed) {
  elements.filters.classList.toggle("is-collapsed", collapsed);
  elements.toggleFiltersBtn.setAttribute("aria-expanded", String(!collapsed));
}

function sortRows(rows) {
  const sorted = [...rows];
  const dir = state.sortDir === "asc" ? 1 : -1;
  sorted.sort((a, b) => {
    if (state.sortKey === "dataVencimento") {
      const aMissing = !a.dataVencimentoDate;
      const bMissing = !b.dataVencimentoDate;
      if (aMissing && bMissing) return Number(a.id || 0) - Number(b.id || 0);
      if (aMissing) return 1;
      if (bMissing) return -1;
      const result = a.dataVencimentoDate.getTime() - b.dataVencimentoDate.getTime();
      return result === 0 ? Number(a.id || 0) - Number(b.id || 0) : result * dir;
    }

    let av = a[state.sortKey];
    let bv = b[state.sortKey];
    if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
    return String(av || "").localeCompare(String(bv || ""), "pt-BR", { sensitivity: "base" }) * dir;
  });
  return sorted;
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
  document.querySelectorAll("[data-sort]").forEach((button) => {
    const label = button.dataset.label || button.textContent.trim().replace(/[↑↓]$/, "").trim();
    button.dataset.label = label;
    const active = button.dataset.sort === state.sortKey;
    button.classList.toggle("is-sorted", active);
    button.textContent = active ? `${label} ${state.sortDir === "asc" ? "↑" : "↓"}` : label;
    button.setAttribute("aria-sort", active ? (state.sortDir === "asc" ? "ascending" : "descending") : "none");
  });
}

function fillSelect(select, allLabel, options) {
  select.innerHTML = [`<option value="todos">${allLabel}</option>`]
    .concat(options.map((option) => `<option value="${escapeAttr(option)}">${escapeHtml(option)}</option>`))
    .join("");
}

function unique(values) {
  return [...new Set(values.map((value) => value || "").filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function parseDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function startOfDay(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

function getPrazoBucket(days) {
  if (days === null || Number.isNaN(days)) return "sem-data";
  if (days < 0) return "vencido";
  if (days <= 30) return "30";
  if (days <= 90) return "90";
  return "futuro";
}

function formatDate(date) {
  return date ? dateFormat.format(date) : "Sem data";
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
  if (days === null || Number.isNaN(days)) return "sem prazo";
  if (days < 0) return `${Math.abs(days)} dia(s) vencido`;
  if (days === 0) return "vence hoje";
  return `${days} dia(s)`;
}

function formatContractTiming(item) {
  if (item.isClosed) return `status ${String(item.status || "fechado").toLowerCase()}`;
  return formatDays(item.diasAtual);
}

function statusClass(status) {
  const slug = normalizeText(status).replace(/\s+/g, "-");
  return `status-${slug || "sem-status"}`;
}

function sum(rows, key) {
  return rows.reduce((total, item) => total + Number(item[key] || 0), 0);
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
    map.set(label, (map.get(label) || 0) + Number(valueAccessor(item) || 0));
  });
  return [...map.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value);
}

function monthlyDeadlines(rows) {
  const map = new Map();
  rows.forEach((item) => {
    if (!item.dataVencimentoDate) return;
    const key = `${item.dataVencimentoDate.getUTCFullYear()}-${String(item.dataVencimentoDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = map.get(key) || { date: item.dataVencimentoDate, count: 0, value: 0 };
    existing.count += 1;
    existing.value += Number(item.valor || 0);
    map.set(key, existing);
  });
  const entries = [...map.values()].sort((a, b) => a.date - b.date).slice(0, 18);
  return {
    labels: entries.map((item) => monthFormat.format(item.date)),
    counts: entries.map((item) => item.count),
    values: entries.map((item) => item.value),
    total: rows.filter((item) => item.dataVencimentoDate).length,
  };
}

function compactCurrency(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    const digits = abs >= 100_000_000 ? 0 : 1;
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: digits })} mi`;
  }
  if (Math.abs(value) >= 1_000) return `R$ ${(value / 1_000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return currency.format(value);
}

function isSmallViewport() {
  return window.matchMedia("(max-width: 720px)").matches;
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
  };
}

function horizontalBarOptions(currencyAxis = false) {
  const small = isSmallViewport();
  return {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(),
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

function deadlineOptions() {
  const small = isSmallViewport();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(),
    scales: {
      y: {
        beginAtZero: true,
        ticks: { precision: 0 },
        grid: { color: "#edf1ed" },
      },
      y1: {
        display: !small,
        beginAtZero: true,
        position: "right",
        ticks: { callback: (value) => compactCurrency(Number(value)) },
        grid: { drawOnChartArea: false },
      },
      x: {
        ticks: {
          maxRotation: small ? 0 : 45,
          callback(value, index) {
            if (small && index % 2) return "";
            return this.getLabelForValue(value);
          },
        },
        grid: { display: false },
      },
    },
  };
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

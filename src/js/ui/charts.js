import { LRU_CACHE_LIMIT, QUALITY_FIELDS, SELECT_ALL } from '../constants.js';
import { countBy, getDeadlineDistribution, getDueMonthData, sumBy } from '../data/aggregate.js';
import { isReducedMotion, isSmallViewport } from '../utils/dom.js';
import { compactCurrency, currency, numberFormat } from '../utils/format.js';
import { applyFilterPatch } from './filters.js';

const charts = {};
const chartSignatures = {};
const chartConfigs = new Map();
const aggregationCache = new Map();
let chartPromise = null;
let observer = null;

export async function loadChart() {
  if (!chartPromise) {
    chartPromise = import('../../../assets/vendor/chart.module.js').then(
      (module) => module.default,
    );
  }
  return chartPromise;
}

export function renderCharts(context, rows, metrics) {
  const { elements } = context;
  const theme = getChartTokens();
  const chartData = getChartAggregations(rows, metrics);

  const statusData = chartData.statusData;
  elements.statusChartHint.textContent = `${statusData.labels.length} status visíveis`;
  renderChart(
    'statusChart',
    'statusChartEmpty',
    {
      type: 'doughnut',
      data: {
        labels: statusData.labels,
        datasets: [
          {
            data: statusData.values,
            backgroundColor: chartColors(statusData.labels.length, theme),
            borderWidth: 2,
            borderColor: theme.chartBorder,
          },
        ],
      },
      options: withDrilldown(doughnutOptions(theme), (label) => {
        applyFilterPatch(context, { status: label || SELECT_ALL }, { focusFirstRow: true });
      }),
    },
    rows.length > 0 && statusData.labels.length > 0,
    context.state.status !== SELECT_ALL,
  );

  const modalidadeData = chartData.modalidadeData;
  elements.modalidadeChartHint.textContent = `${modalidadeData.length} modalidades com maior valor`;
  renderChart(
    'modalidadeChart',
    'modalidadeChartEmpty',
    {
      type: 'bar',
      data: {
        labels: modalidadeData.map((item) => item.label),
        datasets: [
          {
            label: 'Valor',
            data: modalidadeData.map((item) => item.value),
            backgroundColor: theme.brand,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(horizontalBarOptions(true, theme), (label) => {
        applyFilterPatch(context, { modalidade: label || SELECT_ALL }, { focusFirstRow: true });
      }),
    },
    modalidadeData.some((item) => item.value > 0),
    context.state.modalidade !== SELECT_ALL,
  );

  const modalidadeCountData = chartData.modalidadeCountData;
  elements.modalidadeCountChartHint.textContent = `${modalidadeCountData.length} modalidades com maior quantidade`;
  renderChart(
    'modalidadeCountChart',
    'modalidadeCountChartEmpty',
    {
      type: 'bar',
      data: {
        labels: modalidadeCountData.map((item) => item.label),
        datasets: [
          {
            label: 'Contratos',
            data: modalidadeCountData.map((item) => item.value),
            backgroundColor: theme.info,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(horizontalBarOptions(false, theme), (label) => {
        applyFilterPatch(context, { modalidade: label || SELECT_ALL }, { focusFirstRow: true });
      }),
    },
    modalidadeCountData.length > 0,
    context.state.modalidade !== SELECT_ALL,
  );

  const dueMonthData = chartData.dueMonthData;
  elements.dueMonthChartHint.textContent = `${dueMonthData.length} mês(es) com vencimento`;
  renderChart(
    'dueMonthChart',
    'dueMonthChartEmpty',
    {
      type: 'bar',
      data: {
        labels: dueMonthData.map((item) => item.label),
        datasets: [
          {
            label: 'Vencimentos',
            data: dueMonthData.map((item) => item.value),
            backgroundColor: theme.warning,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(verticalBarOptions(false, theme), (_label, index) => {
        const month = dueMonthData[index]?.key;
        if (!month) return;
        const search = `vencimento:${month}..${month}`;
        applyFilterPatch(
          context,
          { search, ano: SELECT_ALL },
          { rawSearch: search, focusFirstRow: true },
        );
      }),
    },
    dueMonthData.length > 0,
    context.state.search.includes('vencimento:'),
  );

  const companyValueData = chartData.companyValueData;
  elements.companyValueChartHint.textContent = `${companyValueData.length} empresas com maior valor`;
  renderChart(
    'companyValueChart',
    'companyValueChartEmpty',
    {
      type: 'bar',
      data: {
        labels: companyValueData.map((item) => item.label),
        datasets: [
          {
            label: 'Valor',
            data: companyValueData.map((item) => item.value),
            backgroundColor: theme.teal,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(horizontalBarOptions(true, theme), (label) => {
        applyCompanyDrilldown(context, label);
      }),
    },
    companyValueData.some((item) => item.value > 0),
    context.state.search.includes('empresa:'),
  );

  const companyCountData = chartData.companyCountData;
  elements.companyCountChartHint.textContent = `${companyCountData.length} empresas com mais contratos`;
  renderChart(
    'companyCountChart',
    'companyCountChartEmpty',
    {
      type: 'bar',
      data: {
        labels: companyCountData.map((item) => item.label),
        datasets: [
          {
            label: 'Contratos',
            data: companyCountData.map((item) => item.value),
            backgroundColor: theme.plum,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(horizontalBarOptions(false, theme), (label) => {
        applyCompanyDrilldown(context, label);
      }),
    },
    companyCountData.length > 0,
    context.state.search.includes('empresa:'),
  );

  const deadlineData = chartData.deadlineData;
  elements.deadlineChartHint.textContent = `${deadlineData.length} faixas de prazo`;
  renderChart(
    'deadlineChart',
    'deadlineChartEmpty',
    {
      type: 'doughnut',
      data: {
        labels: deadlineData.map((item) => item.label),
        datasets: [
          {
            data: deadlineData.map((item) => item.value),
            backgroundColor: deadlineData.map((item) => deadlineColor(item, theme)),
            borderWidth: 2,
            borderColor: theme.chartBorder,
          },
        ],
      },
      options: withDrilldown(doughnutOptions(theme), (_label, index) => {
        const key = deadlineData[index]?.key;
        if (key) applyFilterPatch(context, { prazo: key }, { focusFirstRow: true });
      }),
    },
    deadlineData.length > 0,
    context.state.prazo !== SELECT_ALL,
  );

  const qualityChartData = chartData.qualityChartData;
  elements.qualityChartHint.textContent = `${numberFormat.format(metrics.quality.incompleteCount)} registro(s) incompleto(s)`;
  renderChart(
    'qualityChart',
    'qualityChartEmpty',
    {
      type: 'bar',
      data: {
        labels: qualityChartData.map((item) => item.label),
        datasets: [
          {
            label: 'Contratos',
            data: qualityChartData.map((item) => item.value),
            backgroundColor: theme.warning,
            borderRadius: 6,
          },
        ],
      },
      options: withDrilldown(verticalBarOptions(false, theme), (_label, index) => {
        const field = QUALITY_FIELDS[index];
        if (!field) return;
        const searches = {
          gestor: 'gestor:"Sem gestor informado"',
          fiscal: 'fiscal:"Sem fiscal informado"',
          dataVencimento: 'vencimento:sem-data',
          valor: 'valor:<=0',
          empresa: 'empresa:"Sem empresa informada"',
        };
        const search = searches[field.key];
        if (search) {
          applyFilterPatch(context, { search }, { rawSearch: search, focusFirstRow: true });
        }
      }),
    },
    metrics.filteredContracts > 0,
    context.state.search.length > 0,
  );
}

export function renderChart(canvasId, emptyId, config, hasData, active = false) {
  const canvas = document.getElementById(canvasId);
  const empty = document.getElementById(emptyId);
  if (!canvas) return;
  const frame = canvas.closest('.chart-frame');

  if (!hasData) {
    if (charts[canvasId]) {
      charts[canvasId].destroy();
      delete charts[canvasId];
      delete chartSignatures[canvasId];
    }
    chartConfigs.delete(canvasId);
    frame?.classList.remove('is-chart-pending');
    canvas.hidden = true;
    canvas.setAttribute('aria-hidden', 'true');
    if (empty) empty.hidden = false;
    return;
  }

  canvas.hidden = false;
  canvas.removeAttribute('aria-hidden');
  canvas.setAttribute('role', 'button');
  canvas.setAttribute('aria-pressed', String(active));
  canvas.setAttribute('tabindex', '0');
  if (!canvas.dataset.baseAriaLabel) {
    canvas.dataset.baseAriaLabel = canvas.getAttribute('aria-label') || 'Gráfico interativo';
  }
  canvas.setAttribute(
    'aria-label',
    `${canvas.dataset.baseAriaLabel}. Clique em um item ou pressione Enter para aplicar o primeiro recorte.`,
  );
  if (empty) empty.hidden = true;
  if (!charts[canvasId]) frame?.classList.add('is-chart-pending');
  chartConfigs.set(canvasId, { config, canvas });
  setupChartKeyboard(canvas, canvasId);
  observeChartCanvas(canvas);
  if (isCanvasInViewport(canvas)) {
    void upsertChart(canvasId, config);
  }
}

function setupChartKeyboard(canvas, canvasId) {
  if (canvas.dataset.chartKeyboardReady) return;
  canvas.dataset.chartKeyboardReady = 'true';
  canvas.addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const chart = charts[canvasId];
    const saved = chartConfigs.get(canvasId);
    if (!chart || !saved?.config?.options?.onClick || !chart.data?.labels?.length) return;
    event.preventDefault();
    saved.config.options.onClick({ native: event }, [{ index: 0 }], chart);
  });
}

function withDrilldown(options, handler) {
  return {
    ...options,
    onClick(_event, activeElements, chart) {
      const active = activeElements[0];
      if (!active) return;
      const label = chart.data.labels[active.index];
      handler(label, active.index);
    },
    onHover(event, activeElements) {
      if (!event.native?.target) return;
      event.native.target.classList.toggle('is-drilldown-ready', activeElements.length > 0);
    },
  };
}

function applyCompanyDrilldown(context, label) {
  if (!label) return;
  const search = `empresa:"${label}"`;
  applyFilterPatch(context, { search }, { rawSearch: search, focusFirstRow: true });
}

function observeChartCanvas(canvas) {
  if (!('IntersectionObserver' in window)) {
    void upsertChart(canvas.id, chartConfigs.get(canvas.id).config);
    return;
  }

  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const saved = chartConfigs.get(entry.target.id);
          if (saved) void upsertChart(entry.target.id, saved.config);
        });
      },
      { rootMargin: '200px', threshold: 0.1 },
    );
  }

  observer.observe(canvas);
}

async function upsertChart(id, config) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  const signature = getChartSignature(config);

  if (charts[id] && chartSignatures[id] === signature) {
    ctx.closest('.chart-frame')?.classList.remove('is-chart-pending');
    return;
  }

  const Chart = await loadChart();
  if (charts[id] && charts[id].config.type === config.type) {
    charts[id].data = config.data;
    charts[id].options = config.options;
    charts[id].update(isReducedMotion() ? 'none' : undefined);
  } else {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, config);
  }
  chartSignatures[id] = signature;
  ctx.closest('.chart-frame')?.classList.remove('is-chart-pending');
}

function getChartAggregations(rows, metrics) {
  const cacheKey = getAggregationCacheKey(rows, metrics);
  const cached = getCachedAggregation(cacheKey);
  if (cached) return cached;

  const modalidadeCountMap = countBy(rows, (item) => item.display.modalidade);
  const companyCountMap = countBy(rows, (item) => item.display.empresa);
  const data = {
    statusData: countBy(rows, (item) => item.businessStatus.label),
    modalidadeData: sumBy(
      rows,
      (item) => item.display.modalidade,
      (item) => item.valor,
    ).slice(0, 8),
    modalidadeCountData: modalidadeCountMap.labels
      .map((label, index) => ({ label, value: modalidadeCountMap.values[index] }))
      .slice(0, 8),
    dueMonthData: getDueMonthData(rows),
    companyValueData: sumBy(
      rows,
      (item) => item.display.empresa,
      (item) => item.valor,
    ).slice(0, 8),
    companyCountData: companyCountMap.labels
      .map((label, index) => ({ label, value: companyCountMap.values[index] }))
      .slice(0, 8),
    deadlineData: getDeadlineDistribution(rows),
    qualityChartData: QUALITY_FIELDS.map((field) => ({
      label: field.label,
      value: metrics.quality.counts[field.key],
    })),
  };

  setCachedAggregation(cacheKey, data);
  return data;
}

function getAggregationCacheKey(rows, metrics) {
  return JSON.stringify({
    ids: rows.map((item) => item.id),
    quality: metrics.quality.counts,
  });
}

function getCachedAggregation(key) {
  if (!aggregationCache.has(key)) return null;
  const value = aggregationCache.get(key);
  aggregationCache.delete(key);
  aggregationCache.set(key, value);
  return value;
}

function setCachedAggregation(key, value) {
  aggregationCache.set(key, value);
  if (aggregationCache.size > LRU_CACHE_LIMIT) {
    aggregationCache.delete(aggregationCache.keys().next().value);
  }
}

function getChartSignature(config) {
  return JSON.stringify({
    type: config.type,
    data: config.data,
    small: isSmallViewport(),
    reducedMotion: isReducedMotion(),
  });
}

function commonPlugins(theme) {
  const small = isSmallViewport();
  return {
    legend: {
      position: 'bottom',
      labels: {
        color: theme.textMuted,
        boxWidth: 10,
        boxHeight: 10,
        padding: small ? 10 : 14,
        usePointStyle: true,
        font: { size: small ? 10 : 12 },
      },
    },
    tooltip: {
      backgroundColor: theme.tooltipBg,
      titleColor: theme.tooltipText,
      bodyColor: theme.tooltipText,
      cornerRadius: 8,
      displayColors: true,
      callbacks: {
        label(context) {
          const label = context.dataset.label || context.label || '';
          const value = context.parsed?.x ?? context.parsed?.y ?? context.parsed ?? 0;
          return label === 'Valor'
            ? `${label}: ${currency.format(value)}`
            : `${label}: ${numberFormat.format(value)}`;
        },
      },
    },
  };
}

function doughnutOptions(theme) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    plugins: commonPlugins(theme),
    animation: chartAnimation(),
  };
}

function horizontalBarOptions(currencyAxis = false, theme) {
  const small = isSmallViewport();
  return {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(theme),
    animation: chartAnimation(),
    scales: {
      x: {
        ticks: {
          color: theme.textMuted,
          callback: (value) =>
            currencyAxis ? compactCurrency(Number(value)) : numberFormat.format(value),
        },
        grid: { color: theme.grid },
      },
      y: {
        ticks: {
          color: theme.textMuted,
          callback(value) {
            return shortLabel(this.getLabelForValue(value), small ? 18 : 28);
          },
        },
        grid: { display: false },
      },
    },
  };
}

function verticalBarOptions(currencyAxis = false, theme) {
  const small = isSmallViewport();
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: commonPlugins(theme),
    animation: chartAnimation(),
    scales: {
      x: {
        ticks: {
          color: theme.textMuted,
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
          color: theme.textMuted,
          precision: 0,
          callback: (value) =>
            currencyAxis ? compactCurrency(Number(value)) : numberFormat.format(value),
        },
        grid: { color: theme.grid },
      },
    },
  };
}

function chartAnimation() {
  return isReducedMotion() ? false : { duration: 650, easing: 'easeOutQuart' };
}

function chartColors(length, theme) {
  const palette = [
    theme.brand,
    theme.warning,
    theme.danger,
    theme.plum,
    theme.teal,
    theme.info,
    theme.gold,
    theme.dangerSoft,
    theme.success,
    theme.plumSoft,
  ];
  return Array.from({ length }, (_, index) => palette[index % palette.length]);
}

function deadlineColor(item, theme) {
  const colors = {
    vencido: theme.danger,
    hoje: theme.warningStrong,
    30: theme.warning,
    90: theme.info,
    futuro: theme.brand,
    'sem-data': theme.plum,
  };
  return colors[item.key] || theme.brand;
}

function getChartTokens() {
  const styles = window.getComputedStyle(document.documentElement);
  return {
    brand: cssToken(styles, '--color-brand', '#24715d'),
    teal: cssToken(styles, '--teal', '#16837a'),
    success: cssToken(styles, '--color-success', '#24715d'),
    warning: cssToken(styles, '--color-warning', '#bd7619'),
    warningStrong: cssToken(styles, '--gold', '#d35f1f'),
    danger: cssToken(styles, '--color-danger', '#b7443e'),
    info: cssToken(styles, '--color-info', '#266485'),
    plum: cssToken(styles, '--color-plum', '#70578e'),
    gold: cssToken(styles, '--gold', '#7b6d40'),
    dangerSoft: cssToken(styles, '--color-danger-soft', '#9c5a4f'),
    plumSoft: cssToken(styles, '--color-plum', '#7f678d'),
    chartBorder: cssToken(styles, '--color-surface', '#ffffff'),
    grid: cssToken(styles, '--color-border', '#edf1ed'),
    textMuted: cssToken(styles, '--color-text-muted', '#5d6b66'),
    tooltipBg: cssToken(styles, '--color-text', '#172621'),
    tooltipText: cssToken(styles, '--color-surface', '#ffffff'),
  };
}

function cssToken(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}

function shortLabel(label, length = 22) {
  const text = String(label || '');
  return text.length > length ? `${text.slice(0, length - 1)}…` : text;
}

function isCanvasInViewport(canvas) {
  const rect = canvas.getBoundingClientRect();
  return rect.bottom >= -200 && rect.top <= window.innerHeight + 200;
}

import { showActionFeedback } from './feedback.js';
import { getActiveFilterCount } from './filters.js';
import { loadVendorScript } from '../utils/load-script.js';

export function setupPrintButton(context) {
  window.addEventListener('beforeprint', () => {
    void preparePrintReport(context);
  });

  context.elements.printReportBtn.addEventListener('click', async () => {
    await preparePrintReport(context);
    showActionFeedback(context.elements, 'Preparando relatório para impressão.');
    window.print();
  });
}

async function preparePrintReport(context) {
  const { elements } = context;
  const printedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  const url = getCurrentUrl();

  elements.printGeneratedAt.textContent = `Recorte aplicado em ${printedAt}`;
  elements.printCanonicalUrl.textContent = url;
  renderPrintFilters(context);
  await loadQrCodeVendor();
  renderPrintQr(elements.printQrCode, url);
}

async function loadQrCodeVendor() {
  try {
    await loadVendorScript('assets/vendor/qrcode.min.js', 'qrcode');
  } catch {
    // O relatório impresso continua disponível mesmo se o QR code não puder ser gerado.
  }
}

function renderPrintFilters(context) {
  const { elements } = context;
  const filters = getPrintFilters(context);
  elements.printFiltersList.replaceChildren(
    ...filters.map((filter) => {
      const item = document.createElement('li');
      item.textContent = filter;
      return item;
    }),
  );
}

function getPrintFilters(context) {
  if (!getActiveFilterCount(context)) {
    return ['Sem filtros ativos.'];
  }

  const { elements, state } = context;
  const filters = [];
  if (state.search) filters.push(`Busca: ${elements.searchInput.value.trim()}`);
  if (state.status !== 'todos') filters.push(`Status: ${state.status}`);
  if (state.prazo !== 'todos') {
    filters.push(`Prazo: ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`);
  }
  if (state.modalidade !== 'todos') filters.push(`Modalidade: ${state.modalidade}`);
  if (state.gestor !== 'todos') filters.push(`Gestor: ${state.gestor}`);
  if (state.fiscal !== 'todos') filters.push(`Fiscal: ${state.fiscal}`);
  if (state.ano !== 'todos') filters.push(`Ano de vencimento: ${state.ano}`);
  filters.push(
    `Ordenação: ${elements.sortField.options[elements.sortField.selectedIndex].text} (${state.sortDir === 'asc' ? 'crescente' : 'decrescente'})`,
  );
  return filters;
}

function renderPrintQr(container, text) {
  container.replaceChildren();

  const qr = createQrCode(text);
  if (!qr) {
    container.textContent = 'QR code indisponível.';
    return;
  }

  container.append(createQrSvg(qr));
}

function createQrCode(text) {
  if (typeof window.qrcode !== 'function') return null;

  try {
    const qr = window.qrcode(0, 'M');
    qr.addData(text);
    qr.make();
    return qr;
  } catch {
    return null;
  }
}

function createQrSvg(qr) {
  const namespace = 'http://www.w3.org/2000/svg';
  const size = qr.getModuleCount();
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'QR code da URL atual com filtros aplicados');
  svg.setAttribute('focusable', 'false');

  const background = document.createElementNS(namespace, 'rect');
  background.setAttribute('width', String(size));
  background.setAttribute('height', String(size));
  background.setAttribute('fill', '#ffffff');
  svg.append(background);

  const darkModules = document.createElementNS(namespace, 'path');
  let path = '';
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (qr.isDark(row, column)) path += `M${column} ${row}h1v1h-1z`;
    }
  }
  darkModules.setAttribute('d', path);
  darkModules.setAttribute('fill', '#000000');
  svg.append(darkModules);

  return svg;
}

function getCurrentUrl() {
  return window.location.href;
}

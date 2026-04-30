import { showActionFeedback } from './feedback.js';
import { writeClipboard } from '../utils/clipboard.js';
import { escapeHtml, queryAll, setSafeHtml } from '../utils/dom.js';
import { formatCurrency, formatDate, formatDays } from '../utils/format.js';
import { renderStatusCell } from './table.js';

let activeContext = null;
let activeContract = null;
let lastFocusedElement = null;
let closingFromHash = false;

export function setupContractDetails(context) {
  activeContext = context;
  const { elements } = context;

  [elements.table, elements.expiredTable, elements.completedTable, elements.contractCards].forEach(
    (root) => {
      root.addEventListener('click', (event) => handleContractClick(context, event));
      root.addEventListener('keydown', (event) => handleContractKeydown(context, event));
    },
  );

  elements.contractDialogCloseBtn.addEventListener('click', () =>
    closeContractDialog({ updateHash: true }),
  );
  elements.contractDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeContractDialog({ updateHash: true });
  });
  elements.contractDialog.addEventListener('keydown', trapDialogFocus);
  elements.contractDialog.addEventListener('close', () => {
    if (!closingFromHash) clearContractHash();
    restoreFocus();
  });

  elements.copyContractBtn.addEventListener('click', () => copyContractDetails(context));
  elements.printContractBtn.addEventListener('click', () => printContractDetails(context));
  elements.shareContractBtn.addEventListener('click', () => shareContractDetails(context));

  window.addEventListener('hashchange', () => {
    const id = getContractIdFromHash();
    if (id) {
      openContractDialog(context, id, { updateHash: false });
    } else if (elements.contractDialog.open) {
      closeContractDialog({ updateHash: false });
    }
  });
}

export function openContractFromHash(context) {
  const id = getContractIdFromHash();
  if (id) openContractDialog(context, id, { updateHash: false });
}

function handleContractClick(context, event) {
  const opener = event.target.closest(
    '[data-open-contract], [data-contract-row], [data-contract-card]',
  );
  if (!opener) return;
  if (event.target.closest('button') && !event.target.closest('[data-open-contract]')) return;
  const id = opener.dataset.openContract || opener.dataset.contractId;
  if (id) openContractDialog(context, id, { updateHash: true });
}

function handleContractKeydown(context, event) {
  if (!['Enter', ' '].includes(event.key)) return;
  const target = event.target.closest('[data-contract-row], [data-contract-card]');
  if (!target) return;
  event.preventDefault();
  openContractDialog(context, target.dataset.contractId, { updateHash: true });
}

function openContractDialog(context, id, options = {}) {
  const item = context.records.find((record) => String(record.id) === String(id));
  if (!item) return;

  activeContext = context;
  activeContract = item;
  lastFocusedElement = document.activeElement;
  renderContractDialog(context, item);

  if (!context.elements.contractDialog.open) {
    context.elements.contractDialog.showModal();
  }
  context.elements.contractDialogCloseBtn.focus();
  if (options.updateHash !== false) setContractHash(item.id);
}

function closeContractDialog(options = {}) {
  const { elements } = activeContext || {};
  if (!elements?.contractDialog.open) return;
  closingFromHash = options.updateHash === false;
  elements.contractDialog.close();
  closingFromHash = false;
  if (options.updateHash !== false) clearContractHash();
}

function renderContractDialog({ elements }, item) {
  elements.contractDialogEyebrow.textContent = `ID ${item.id ?? ''}`;
  elements.contractDialogTitle.textContent = item.display.contrato;
  setSafeHtml(
    elements.contractDialogBody,
    `
      <section class="contract-detail-summary" aria-label="Resumo do contrato">
        <div>
          <span>Status do painel</span>
          ${renderStatusCell(item)}
        </div>
        <div>
          <span>Valor</span>
          <strong>${escapeHtml(formatCurrency(item.valor))}</strong>
        </div>
        <div>
          <span>Vencimento</span>
          <strong>${escapeHtml(formatDate(item.dataVencimentoDate))}</strong>
          <small>${escapeHtml(formatDays(item.diasAtual))}</small>
        </div>
      </section>
      <section class="contract-detail-section" aria-labelledby="contractFieldsTitle">
        <h3 id="contractFieldsTitle">Campos do contrato</h3>
        <dl class="contract-detail-list">
          ${detailRows(item).join('')}
        </dl>
      </section>
      <section class="contract-detail-section" aria-labelledby="contractClassificationTitle">
        <h3 id="contractClassificationTitle">Histórico de classificação</h3>
        <ol class="classification-history">
          <li><strong>Planilha:</strong> ${escapeHtml(item.display.statusSource)}.</li>
          <li><strong>Regra aplicada:</strong> ${escapeHtml(getClassificationRule(item))}</li>
          <li><strong>Painel:</strong> ${escapeHtml(item.businessStatus.label)} (${escapeHtml(item.businessStatus.timingLabel)}).</li>
        </ol>
      </section>
    `,
  );
}

function detailRows(item) {
  const rows = [
    ['Contrato', item.display.contrato],
    ['Processo', item.display.processo],
    ['Objeto', item.display.objeto],
    ['Empresa', item.display.empresa],
    ['Modalidade', item.display.modalidade],
    ['Número da modalidade', item.numeroModalidade],
    ['Valor', item.display.valor],
    ['Data de início', formatDate(item.dataInicioDate, 'Sem data de início')],
    ['Data de vencimento', item.display.dataVencimento],
    ['Gestor', item.display.gestor],
    ['Fiscal', item.display.fiscal],
    ['Observações', item.observacoes || 'Sem observações'],
  ];

  return rows.map(
    ([label, value]) => `
      <div>
        <dt>${escapeHtml(label)}</dt>
        <dd>${escapeHtml(value ?? 'Sem informação')}</dd>
      </div>
    `,
  );
}

function getClassificationRule(item) {
  if (item.isClosed) return 'Status original indica contrato encerrado ou concluído.';
  if (!item.dataVencimentoDate) return 'Contrato sem data de vencimento válida.';
  if (item.diasAtual < 0) return 'Data de vencimento já passou e o contrato segue aberto.';
  if (item.diasAtual <= 7) return 'Contrato aberto vencendo hoje ou em até 7 dias.';
  if (item.diasAtual <= 30) return 'Contrato aberto vencendo em até 30 dias.';
  if (item.diasAtual <= 90) return 'Contrato aberto vencendo entre 31 e 90 dias.';
  return 'Contrato aberto com vencimento acima de 90 dias.';
}

async function copyContractDetails(context) {
  if (!activeContract) return;
  const ok = await writeClipboard(buildContractText(activeContract));
  showActionFeedback(
    context.elements,
    ok ? 'Dados do contrato copiados.' : 'Não foi possível copiar automaticamente.',
  );
}

function printContractDetails(context) {
  if (!activeContract) return;
  document.body.classList.add('is-printing-contract');
  showActionFeedback(context.elements, 'Preparando impressão deste contrato.');
  window.print();
  window.setTimeout(() => document.body.classList.remove('is-printing-contract'), 500);
}

async function shareContractDetails(context) {
  if (!activeContract) return;
  const url = getContractUrl(activeContract.id);
  const title = `Contrato ${activeContract.display.contrato}`;
  const text = `${title} - ${activeContract.display.empresa}`;

  try {
    if (navigator.share) {
      await navigator.share({ title, text, url });
      showActionFeedback(context.elements, 'Link de compartilhamento enviado.');
      return;
    }
  } catch {
    // Fallback por cópia.
  }

  const ok = await writeClipboard(url);
  showActionFeedback(
    context.elements,
    ok ? 'Link do contrato copiado.' : 'Não foi possível compartilhar automaticamente.',
  );
}

function buildContractText(item) {
  return detailRowsForText(item)
    .map(([label, value]) => `${label}: ${value || 'Sem informação'}`)
    .join('\n');
}

function detailRowsForText(item) {
  return [
    ['ID', item.id],
    ['Contrato', item.display.contrato],
    ['Processo', item.display.processo],
    ['Objeto', item.display.objeto],
    ['Empresa', item.display.empresa],
    ['Modalidade', item.display.modalidade],
    ['Valor', item.display.valor],
    ['Vencimento', item.display.dataVencimento],
    ['Status do painel', item.businessStatus.label],
    ['Status da planilha', item.display.statusSource],
    ['Gestor', item.display.gestor],
    ['Fiscal', item.display.fiscal],
    ['Observações', item.observacoes || 'Sem observações'],
  ];
}

function trapDialogFocus(event) {
  if (event.key !== 'Tab') return;
  const focusable = queryAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    event.currentTarget,
  ).filter((element) => !element.disabled && element.offsetParent !== null);
  if (!focusable.length) return;

  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}

function restoreFocus() {
  if (lastFocusedElement?.isConnected) {
    lastFocusedElement.focus();
  }
}

function getContractIdFromHash() {
  const match = window.location.hash.match(/^#contrato\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

function setContractHash(id) {
  const nextUrl = `${window.location.pathname}${window.location.search}#contrato/${encodeURIComponent(id)}`;
  window.history.pushState(null, '', nextUrl);
}

function clearContractHash() {
  if (!window.location.hash.startsWith('#contrato/')) return;
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}`);
}

function getContractUrl(id) {
  return `${window.location.origin}${window.location.pathname}${window.location.search}#contrato/${encodeURIComponent(id)}`;
}

import { escapeHtml, queryAll, setSafeHtml } from '../utils/dom.js';
import { numberFormat } from '../utils/format.js';
import { showActionFeedback } from './feedback.js';

let lastFocusedElement = null;

export function setupDataWarnings(context) {
  const { elements } = context;
  elements.dataWarningsDetailsBtn.addEventListener('click', () => openWarningsDialog(elements));
  elements.dataWarningsCloseBtn.addEventListener('click', () =>
    elements.dataWarningsDialog.close(),
  );
  elements.dataWarningsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    elements.dataWarningsDialog.close();
  });
  elements.dataWarningsDialog.addEventListener('keydown', trapDialogFocus);
  elements.dataWarningsDialog.addEventListener('close', () => {
    if (lastFocusedElement?.isConnected) lastFocusedElement.focus();
  });
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

export function renderDataWarnings({ elements }, warnings) {
  if (!warnings.length) {
    elements.dataWarningsBanner.hidden = true;
    return;
  }

  const countText = `${numberFormat.format(warnings.length)} ${warnings.length === 1 ? 'registro com aviso' : 'registros com avisos'}.`;
  elements.dataWarningsTitle.textContent = countText;
  elements.dataWarningsSummary.textContent = 'Ver detalhes.';
  elements.dataWarningsBanner.hidden = false;
  setSafeHtml(elements.dataWarningsList, warnings.map(renderWarningItem).join(''));
  elements.dataWarningsMailto.href = buildMailto(warnings);
  showActionFeedback(elements, countText);
}

function openWarningsDialog(elements) {
  lastFocusedElement = document.activeElement;
  elements.dataWarningsDialog.showModal();
  elements.dataWarningsCloseBtn.focus();
}

function renderWarningItem(warning) {
  return `<li><strong>ID ${escapeHtml(warning.id)}</strong> — ${escapeHtml(warning.field)}: ${escapeHtml(warning.message)}</li>`;
}

function buildMailto(warnings) {
  const body = warnings
    .slice(0, 20)
    .map((warning) => `ID ${warning.id} - ${warning.field}: ${warning.message}`)
    .join('\n');
  const params = new URLSearchParams({
    subject: 'Correção de dados do painel de contratos',
    body,
  });
  return `mailto:transparencia@iguape.sp.gov.br?${params.toString()}`;
}

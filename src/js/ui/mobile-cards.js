import { STORAGE_KEYS } from '../constants.js';
import {
  addMediaChangeListener,
  escapeAttr,
  escapeHtml,
  isSmallViewport,
  setSafeHtml,
} from '../utils/dom.js';
import { icon } from '../utils/icons.js';
import { renderStatusCell, fieldCellClass, missingFieldTitle } from './table.js';

export function setupMobileCards(context) {
  const { elements, state, render } = context;
  state.viewMode = getStoredViewMode();
  syncMobileView(context);

  elements.mobileViewToggleBtn.addEventListener('click', () => {
    state.viewMode = state.viewMode === 'cards' ? 'table' : 'cards';
    storeViewMode(state.viewMode);
    syncMobileView(context);
    render({ syncUrl: false });
  });

  addMediaChangeListener(window.matchMedia('(max-width: 720px)'), () => syncMobileView(context));
}

export function renderMobileCards(context, rows) {
  const { elements, state } = context;
  const visibleRows = rows.slice(0, state.visibleLimit);

  if (!visibleRows.length) {
    setSafeHtml(
      elements.contractCards,
      '<p class="empty-card-state">Nenhum contrato com esses filtros. Tente limpar um recorte ativo.</p>',
    );
    return;
  }

  setSafeHtml(
    elements.contractCards,
    visibleRows
      .map(
        (item) => `
    <article class="contract-card ${escapeAttr(item.businessStatus.rowClass)}" data-contract-card data-contract-id="${escapeAttr(item.id ?? '')}" tabindex="0" aria-labelledby="contract-card-${escapeAttr(item.id ?? '')}">
      <div class="contract-card-header">
        <div>
          <span class="contract-card-kicker">Contrato</span>
          <h3 id="contract-card-${escapeAttr(item.id ?? '')}">${escapeHtml(item.display.contrato)}</h3>
        </div>
        ${renderStatusCell(item)}
      </div>
      <p class="contract-card-company ${escapeAttr(fieldCellClass(item, 'empresa'))}"${missingFieldTitle(item, 'empresa')}>${escapeHtml(item.display.empresa)}</p>
      <p class="contract-card-object">${escapeHtml(summarizeObject(item.display.objeto))}</p>
      <dl class="contract-card-facts">
        <div>
          <dt>Vencimento</dt>
          <dd class="${escapeAttr(fieldCellClass(item, 'dataVencimento'))}"${missingFieldTitle(item, 'dataVencimento')}>${escapeHtml(item.display.dataVencimento)}</dd>
        </div>
        <div>
          <dt>Valor</dt>
          <dd class="${escapeAttr(fieldCellClass(item, 'valor'))}"${missingFieldTitle(item, 'valor')}>${escapeHtml(item.display.valor)}</dd>
        </div>
      </dl>
      <div class="contract-card-people">
        <span class="${escapeAttr(fieldCellClass(item, 'gestor'))}"${missingFieldTitle(item, 'gestor')}>${icon('user-round-x')} Gestor: ${escapeHtml(item.display.gestor)}</span>
        <span class="${escapeAttr(fieldCellClass(item, 'fiscal'))}"${missingFieldTitle(item, 'fiscal')}>${icon('clipboard-check')} Fiscal: ${escapeHtml(item.display.fiscal)}</span>
      </div>
      <button class="contract-card-action" type="button" data-open-contract="${escapeAttr(item.id ?? '')}">Ver detalhes</button>
    </article>
  `,
      )
      .join(''),
  );
}

export function syncMobileView({ elements, state }) {
  const cardsMode = isSmallViewport() && state.viewMode === 'cards';
  elements.contractCards.hidden = !cardsMode;
  elements.tableScroll.hidden = cardsMode;
  elements.mobileViewToggleBtn.setAttribute('aria-pressed', String(cardsMode));
  elements.mobileViewToggleBtn.hidden = !isSmallViewport();
  elements.mobileViewToggleLabel.textContent = cardsMode ? 'Tabela' : 'Cards';
}

function getStoredViewMode() {
  try {
    return localStorage.getItem(STORAGE_KEYS.viewMode) === 'cards' ? 'cards' : 'table';
  } catch {
    return 'table';
  }
}

function storeViewMode(value) {
  try {
    localStorage.setItem(STORAGE_KEYS.viewMode, value);
  } catch {
    // A alternância continua funcionando mesmo sem persistência local.
  }
}

function summarizeObject(value) {
  const text = String(value ?? '');
  return text.length > 132 ? `${text.slice(0, 129)}...` : text;
}

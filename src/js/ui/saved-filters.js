import { SELECT_ALL, STORAGE_KEYS, defaultSort } from '../constants.js';
import { escapeAttr, escapeHtml, setSafeHtml } from '../utils/dom.js';
import { downloadTextFile } from './export-csv.js';
import { showActionFeedback } from './feedback.js';
import { applyFilterPatch } from './filters.js';

const MAX_SAVED_FILTERS = 10;

export function setupSavedFilters(context) {
  const { elements } = context;
  renderSavedFilters(context);

  elements.saveFilterBtn.addEventListener('click', () => saveCurrentFilter(context));
  elements.exportFiltersBtn.addEventListener('click', () => exportSavedFilters(context));
  elements.importFiltersBtn.addEventListener('click', () => elements.importFiltersInput.click());
  elements.importFiltersInput.addEventListener('change', (event) =>
    importSavedFilters(context, event),
  );
  elements.savedFiltersList.addEventListener('click', (event) =>
    handleSavedFilterAction(context, event),
  );
}

export function renderSavedFilters(context) {
  const filters = readSavedFilters();
  if (!filters.length) {
    setSafeHtml(
      context.elements.savedFiltersList,
      '<p class="saved-filter-empty">Nenhum filtro salvo.</p>',
    );
    return;
  }

  setSafeHtml(
    context.elements.savedFiltersList,
    filters
      .map(
        (filter) => `
      <article class="saved-filter-item">
        <button type="button" data-saved-filter-apply="${escapeAttr(filter.id)}">${escapeHtml(filter.name)}</button>
        <div>
          <button type="button" data-saved-filter-rename="${escapeAttr(filter.id)}">Renomear</button>
          <button type="button" data-saved-filter-delete="${escapeAttr(filter.id)}">Excluir</button>
        </div>
      </article>
    `,
      )
      .join(''),
  );
}

function saveCurrentFilter(context) {
  const filters = readSavedFilters();
  if (filters.length >= MAX_SAVED_FILTERS) {
    showActionFeedback(context.elements, 'Limite de 10 filtros salvos atingido.');
    return;
  }

  const name = window.prompt('Nome do filtro salvo:', suggestFilterName(context));
  if (!name?.trim()) return;

  filters.push({
    id: createFilterId(name),
    name: name.trim().slice(0, 48),
    state: snapshotFilterState(context),
    createdAt: new Date().toISOString(),
  });
  writeSavedFilters(filters);
  renderSavedFilters(context);
  showActionFeedback(context.elements, 'Filtro salvo neste navegador.');
}

function handleSavedFilterAction(context, event) {
  const applyButton = event.target.closest('[data-saved-filter-apply]');
  const renameButton = event.target.closest('[data-saved-filter-rename]');
  const deleteButton = event.target.closest('[data-saved-filter-delete]');

  if (applyButton) {
    applySavedFilter(context, applyButton.dataset.savedFilterApply);
  } else if (renameButton) {
    renameSavedFilter(context, renameButton.dataset.savedFilterRename);
  } else if (deleteButton) {
    deleteSavedFilter(context, deleteButton.dataset.savedFilterDelete);
  }
}

function applySavedFilter(context, id) {
  const filter = readSavedFilters().find((item) => item.id === id);
  if (!filter) return;
  applyFilterPatch(context, filter.state, {
    rawSearch: filter.state.rawSearch || filter.state.search || '',
    focusFirstRow: true,
  });
  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}#filtro/${encodeURIComponent(filter.name)}`,
  );
  showActionFeedback(context.elements, `Filtro "${filter.name}" aplicado.`);
}

function renameSavedFilter(context, id) {
  const filters = readSavedFilters();
  const filter = filters.find((item) => item.id === id);
  if (!filter) return;
  const name = window.prompt('Novo nome do filtro:', filter.name);
  if (!name?.trim()) return;
  filter.name = name.trim().slice(0, 48);
  writeSavedFilters(filters);
  renderSavedFilters(context);
  showActionFeedback(context.elements, 'Filtro renomeado.');
}

function deleteSavedFilter(context, id) {
  const filters = readSavedFilters().filter((item) => item.id !== id);
  writeSavedFilters(filters);
  renderSavedFilters(context);
  showActionFeedback(context.elements, 'Filtro excluído.');
}

function exportSavedFilters(context) {
  const filters = readSavedFilters();
  downloadTextFile(
    'filtros-salvos-contratos-iguape.json',
    JSON.stringify(filters, null, 2),
    'application/json;charset=utf-8',
  );
  showActionFeedback(context.elements, 'Filtros salvos exportados em JSON.');
}

async function importSavedFilters(context, event) {
  const [file] = event.target.files || [];
  event.target.value = '';
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error('Formato inválido.');
    const normalized = imported
      .slice(0, MAX_SAVED_FILTERS)
      .map(normalizeImportedFilter)
      .filter(Boolean);
    writeSavedFilters(normalized);
    renderSavedFilters(context);
    showActionFeedback(context.elements, 'Filtros importados.');
  } catch {
    showActionFeedback(context.elements, 'Não foi possível importar esse JSON.');
  }
}

function normalizeImportedFilter(filter) {
  if (!filter?.name || !filter?.state) return null;
  return {
    id: filter.id || createFilterId(filter.name),
    name: String(filter.name).slice(0, 48),
    state: normalizeFilterState(filter.state),
    createdAt: filter.createdAt || new Date().toISOString(),
  };
}

function snapshotFilterState({ elements, state }) {
  return normalizeFilterState({
    search: state.search,
    rawSearch: elements.searchInput.value.trim(),
    status: state.status,
    modalidade: state.modalidade,
    gestor: state.gestor,
    fiscal: state.fiscal,
    prazo: state.prazo,
    ano: state.ano,
    sortKey: state.sortKey,
    sortDir: state.sortDir,
  });
}

function normalizeFilterState(state) {
  return {
    search: state.search || '',
    rawSearch: state.rawSearch || state.search || '',
    status: state.status || SELECT_ALL,
    modalidade: state.modalidade || SELECT_ALL,
    gestor: state.gestor || SELECT_ALL,
    fiscal: state.fiscal || SELECT_ALL,
    prazo: state.prazo || SELECT_ALL,
    ano: state.ano || SELECT_ALL,
    sortKey: state.sortKey || defaultSort.key,
    sortDir: state.sortDir || defaultSort.dir,
  };
}

function suggestFilterName({ elements, state }) {
  if (state.search) return `Busca ${elements.searchInput.value.trim()}`;
  if (state.prazo !== SELECT_ALL) {
    return `Prazo ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`;
  }
  if (state.status !== SELECT_ALL) return `Status ${state.status}`;
  return 'Meu filtro';
}

function readSavedFilters() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.savedFilters) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, MAX_SAVED_FILTERS) : [];
  } catch {
    return [];
  }
}

function writeSavedFilters(filters) {
  try {
    localStorage.setItem(
      STORAGE_KEYS.savedFilters,
      JSON.stringify(filters.slice(0, MAX_SAVED_FILTERS)),
    );
  } catch {
    // O painel segue funcional sem favoritos persistidos.
  }
}

function createFilterId(name) {
  return `${Date.now()}-${String(name)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}`;
}

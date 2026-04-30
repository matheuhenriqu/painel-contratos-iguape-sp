import { SELECT_ALL } from '../constants.js';
import { queryAll } from '../utils/dom.js';
import {
  applyFilterPatch,
  applyQuickFilter,
  clearAllFilters,
  clearSearch,
  expandFilters,
} from './filters.js';
import { focusVisibleContractByOffset } from './table.js';

let sequenceKey = '';
let sequenceTimer = 0;
let lastFocusedBeforeShortcuts = null;

export function setupKeyboardShortcuts(context) {
  const { elements } = context;
  document.addEventListener('keydown', (event) => handleShortcut(context, event));
  elements.shortcutsDialogCloseBtn.addEventListener('click', () => closeShortcutsDialog(elements));
  elements.shortcutsDialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeShortcutsDialog(elements);
  });
  elements.shortcutsDialog.addEventListener('keydown', trapShortcutsDialogFocus);
  elements.shortcutsDialog.addEventListener('close', () => {
    if (lastFocusedBeforeShortcuts?.isConnected) {
      lastFocusedBeforeShortcuts.focus();
    }
  });
}

function handleShortcut(context, event) {
  if (document.querySelector('dialog[open]')) return;
  if (isEditableTarget(event.target)) return;

  if (event.key === '/') {
    event.preventDefault();
    expandFilters(context);
    context.elements.searchInput.focus();
    return;
  }

  if (event.key === '?') {
    event.preventDefault();
    openShortcutsDialog(context.elements);
    return;
  }

  if (event.key === 'Escape') {
    handleEscape(context);
    return;
  }

  if (event.key === 'j') {
    event.preventDefault();
    focusVisibleContractByOffset(1);
    return;
  }

  if (event.key === 'k') {
    event.preventDefault();
    focusVisibleContractByOffset(-1);
    return;
  }

  handleSequence(context, event);
}

function handleSequence(context, event) {
  window.clearTimeout(sequenceTimer);

  if (!sequenceKey && event.key === 'g') {
    sequenceKey = 'g';
    sequenceTimer = window.setTimeout(resetSequence, 900);
    return;
  }

  if (sequenceKey !== 'g') return;

  const quickFilters = {
    a: 'ativos',
    v: 'vencidos',
    3: '30',
  };
  const filter = quickFilters[event.key];
  resetSequence();
  if (!filter) return;

  event.preventDefault();
  applyQuickFilter(context, filter);
}

function handleEscape(context) {
  const { state } = context;
  if (state.search) {
    clearSearch(context);
    return;
  }

  if (
    state.status !== SELECT_ALL ||
    state.modalidade !== SELECT_ALL ||
    state.gestor !== SELECT_ALL ||
    state.fiscal !== SELECT_ALL ||
    state.prazo !== SELECT_ALL ||
    state.ano !== SELECT_ALL
  ) {
    clearAllFilters(context, { focusFirstRow: true });
  } else {
    applyFilterPatch(context, {}, { focusFirstRow: true });
  }
}

function resetSequence() {
  sequenceKey = '';
  window.clearTimeout(sequenceTimer);
}

function openShortcutsDialog(elements) {
  lastFocusedBeforeShortcuts = document.activeElement;
  elements.shortcutsDialog.showModal();
  elements.shortcutsDialogCloseBtn.focus();
}

function closeShortcutsDialog(elements) {
  if (elements.shortcutsDialog.open) elements.shortcutsDialog.close();
}

function trapShortcutsDialogFocus(event) {
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

function isEditableTarget(target) {
  return Boolean(target?.closest?.("input, textarea, select, [contenteditable='true']"));
}

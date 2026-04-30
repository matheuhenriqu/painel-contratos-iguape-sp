import { STORAGE_KEYS } from '../constants.js';
import { addMediaChangeListener } from '../utils/dom.js';
import { showActionFeedback } from './feedback.js';

const themeOrder = ['auto', 'light', 'dark', 'hc'];
const themeLabels = {
  auto: 'automático',
  light: 'claro',
  dark: 'escuro',
  hc: 'alto contraste',
};
const themeIcons = {
  auto: 'sun-moon',
  light: 'sun',
  dark: 'moon',
  hc: 'contrast',
};
const themeColors = {
  light: '#16664f',
  dark: '#0e1414',
  hc: '#000000',
};

let systemThemeQuery = null;
let currentMode = 'auto';

export function setupTheme(context) {
  const { elements } = context;
  systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  currentMode = getStoredTheme();

  applyTheme(elements, currentMode, { announce: false, persist: false, emit: false });

  elements.themeToggleBtn.addEventListener('click', () => {
    const nextMode = getNextThemeMode(currentMode);
    applyTheme(elements, nextMode, { announce: true, persist: true, emit: true });
  });

  addMediaChangeListener(systemThemeQuery, () => {
    if (currentMode === 'auto') {
      applyTheme(elements, 'auto', { announce: false, persist: false, emit: true });
    }
  });
}

function getStoredTheme() {
  try {
    const value = window.localStorage.getItem(STORAGE_KEYS.theme);
    return themeOrder.includes(value) ? value : 'auto';
  } catch {
    return 'auto';
  }
}

function getNextThemeMode(mode) {
  const index = themeOrder.indexOf(mode);
  return themeOrder[(index + 1) % themeOrder.length];
}

function applyTheme(elements, mode, options) {
  currentMode = mode;
  const resolvedTheme = getResolvedTheme(mode);
  const root = document.documentElement;
  root.dataset.themeMode = mode;
  root.dataset.resolvedTheme = resolvedTheme;

  if (mode === 'auto') {
    root.removeAttribute('data-theme');
  } else {
    root.dataset.theme = mode;
  }

  if (options.persist) storeTheme(mode);
  updateThemeColor(resolvedTheme);
  updateThemeControl(elements, mode);

  if (options.announce) {
    elements.themeStatus.textContent = `Tema ${themeLabels[mode]} ativado.`;
    showActionFeedback(elements, `Tema ${themeLabels[mode]} ativado.`);
  }

  if (options.emit) {
    window.dispatchEvent(new CustomEvent('theme:changed', { detail: { mode, resolvedTheme } }));
  }
}

function storeTheme(mode) {
  try {
    window.localStorage.setItem(STORAGE_KEYS.theme, mode);
  } catch {
    // A preferência visual continua aplicada mesmo sem armazenamento local.
  }
}

function getResolvedTheme(mode) {
  if (mode === 'hc') return 'hc';
  if (mode === 'dark' || mode === 'light') return mode;
  return systemThemeQuery?.matches ? 'dark' : 'light';
}

function updateThemeColor(resolvedTheme) {
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', themeColors[resolvedTheme]);
}

function updateThemeControl(elements, mode) {
  const label = themeLabels[mode];
  elements.themeToggleBtn.setAttribute('aria-label', `Alternar tema, atual: ${label}`);
  elements.themeToggleBtn.title = `Alternar tema, atual: ${label}`;
  elements.themeToggleIcon
    .querySelector('use')
    ?.setAttribute('href', `assets/icons/sprite.svg#${themeIcons[mode]}`);
  elements.themeToggleLabel.textContent = `Tema ${label}`;
}

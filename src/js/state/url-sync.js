import { SELECT_ALL, SORT_KEYS, URL_PARAM_KEYS, defaultSort } from '../constants.js';

export function restoreStateFromUrl({ state, elements, useStoredDensity, getStoredCompactRows }) {
  const params = new URLSearchParams(window.location.search);
  const searchText = params.get(URL_PARAM_KEYS.search) || '';

  Object.assign(state, {
    search: normalizeStateSearch(searchText),
    status: getAllowedSelectValue(elements.statusFilter, params.get(URL_PARAM_KEYS.status)),
    modalidade: getAllowedSelectValue(
      elements.modalidadeFilter,
      params.get(URL_PARAM_KEYS.modalidade),
    ),
    gestor: getAllowedSelectValue(elements.gestorFilter, params.get(URL_PARAM_KEYS.gestor)),
    fiscal: getAllowedSelectValue(elements.fiscalFilter, params.get(URL_PARAM_KEYS.fiscal)),
    prazo: getAllowedSelectValue(elements.prazoFilter, params.get(URL_PARAM_KEYS.prazo)),
    ano: getAllowedSelectValue(elements.anoFilter, params.get(URL_PARAM_KEYS.ano)),
    sortKey: getAllowedSortKey(params.get(URL_PARAM_KEYS.sortKey)),
    sortDir: getAllowedSortDir(params.get(URL_PARAM_KEYS.sortDir)),
    compactRows: getUrlDensityValue(params, useStoredDensity, getStoredCompactRows),
  });

  elements.searchInput.value = searchText;
}

export function updateUrlFromState({ state, elements }) {
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
  if (state.compactRows) params.set(URL_PARAM_KEYS.compactRows, '1');

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;

  if (nextUrl !== currentUrl) {
    try {
      window.history.replaceState(null, '', nextUrl);
    } catch {
      // A URL continua opcional; a consulta segue funcionando mesmo sem History API.
    }
  }
}

function setFilterParam(params, key, value) {
  if (value !== SELECT_ALL) params.set(key, value);
}

function getAllowedSelectValue(select, value) {
  if (!value) return SELECT_ALL;
  return [...select.options].some((option) => option.value === value) ? value : SELECT_ALL;
}

function getAllowedSortKey(value) {
  return SORT_KEYS.has(value) ? value : defaultSort.key;
}

function getAllowedSortDir(value) {
  return value === 'asc' || value === 'desc' ? value : defaultSort.dir;
}

function getUrlDensityValue(params, useStoredDensity, getStoredCompactRows) {
  const value = params.get(URL_PARAM_KEYS.compactRows);
  if (value === '1') return true;
  if (value === '0') return false;
  return useStoredDensity ? getStoredCompactRows() : false;
}

function normalizeStateSearch(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

import { SELECT_ALL, defaultSort, pageSize } from '../constants.js';

export function createStore(initialState) {
  const listeners = new Set();
  const target = { ...initialState };
  const state = new Proxy(target, {
    set(object, property, value) {
      const previousValue = object[property];
      object[property] = value;
      if (previousValue !== value) {
        listeners.forEach((listener) => listener({ property, value, previousValue, state }));
      }
      return true;
    },
  });

  return {
    state,
    patch(values) {
      Object.assign(state, values);
    },
    snapshot() {
      return { ...target };
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export const appStore = createStore({
  search: '',
  status: SELECT_ALL,
  modalidade: SELECT_ALL,
  gestor: SELECT_ALL,
  fiscal: SELECT_ALL,
  prazo: SELECT_ALL,
  ano: SELECT_ALL,
  sortKey: defaultSort.key,
  sortDir: defaultSort.dir,
  visibleLimit: pageSize.desktop,
  compactRows: false,
  viewMode: 'table',
});

export const state = appStore.state;

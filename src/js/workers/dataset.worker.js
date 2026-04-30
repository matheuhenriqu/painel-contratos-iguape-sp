import { normalizeRecords } from '../data/normalize.js';
import { startOfDay } from '../utils/dates.js';

self.addEventListener('message', (event) => {
  const { sourceData, todayIso } = event.data || {};

  try {
    const today = startOfDay(new Date(todayIso || Date.now()));
    const records = normalizeRecords(sourceData, today);
    self.postMessage({ type: 'success', records });
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : 'Falha ao processar os contratos.',
    });
  }
});

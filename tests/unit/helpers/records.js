import { normalizeRecords } from '../../../src/js/data/normalize.js';
import { parseDate } from '../../../src/js/utils/dates.js';

export function makeSourceRecord(overrides = {}) {
  return {
    id: 1,
    modalidade: 'Pregão Eletrônico',
    numeroModalidade: '030/2025',
    objeto: 'Serviço de limpeza urbana',
    processo: '836/2025',
    contrato: 'CT 222/2025',
    empresa: 'Empresa Iguape',
    valor: 1000,
    valorDescricao: null,
    dataInicio: '2026-01-01',
    dataVencimento: '2026-02-15',
    diasPlanilha: 45,
    status: 'Ativo',
    gestor: 'Gestor Teste',
    fiscal: 'Fiscal Teste',
    observacoes: 'Observação',
    ...overrides,
  };
}

export function makeNormalizedRows(records, today = '2026-01-31') {
  return normalizeRecords({ records }, parseDate(today));
}

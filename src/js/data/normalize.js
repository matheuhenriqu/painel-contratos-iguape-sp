import { FIELD_FALLBACKS } from '../constants.js';
import { calculateDaysUntil, parseDate } from '../utils/dates.js';
import { formatCurrency, formatDate, toFiniteNumber } from '../utils/format.js';
import { compactSearchText, getFieldText, isBlank, normalizeText } from '../utils/strings.js';
import { classifyContract } from './classify.js';

export function normalizeRecords(sourceData, today) {
  return sourceData.records.map((record) => {
    const dataVencimento = parseDate(record.dataVencimento);
    const diasAtual = calculateDaysUntil(dataVencimento, today);
    const businessStatus = classifyContract(record, dataVencimento, diasAtual);
    const display = buildDisplayFields(record, dataVencimento, businessStatus);
    const normalized = buildSearchIndex(record, display, businessStatus);
    return {
      ...record,
      display,
      businessStatus,
      normalized,
      normalizedCompact: compactSearchText(normalized),
      dataVencimentoDate: dataVencimento,
      dataInicioDate: parseDate(record.dataInicio),
      diasAtual,
      prazoBucket: businessStatus.prazoBucket,
      anoVencimento: dataVencimento
        ? String(dataVencimento.getUTCFullYear())
        : FIELD_FALLBACKS.dataVencimento,
      isClosed: businessStatus.group === 'closed',
    };
  });
}

export function buildDisplayFields(record, dataVencimento, businessStatus) {
  return {
    contrato: getFieldText(record.contrato, FIELD_FALLBACKS.contrato),
    processo: getFieldText(record.processo, FIELD_FALLBACKS.processo),
    objeto: getFieldText(record.objeto, FIELD_FALLBACKS.objeto),
    empresa: getFieldText(record.empresa, FIELD_FALLBACKS.empresa),
    modalidade: getFieldText(record.modalidade, FIELD_FALLBACKS.modalidade),
    gestor: getFieldText(record.gestor, FIELD_FALLBACKS.gestor),
    fiscal: getFieldText(record.fiscal, FIELD_FALLBACKS.fiscal),
    valor: formatContractValue(record.valor),
    dataVencimento: formatDate(dataVencimento),
    statusSource: getFieldText(record.status, FIELD_FALLBACKS.status),
    status: businessStatus.label,
    isMissing: {
      contrato: isBlank(record.contrato),
      processo: isBlank(record.processo),
      objeto: isBlank(record.objeto),
      empresa: isBlank(record.empresa),
      modalidade: isBlank(record.modalidade),
      gestor: isBlank(record.gestor),
      fiscal: isBlank(record.fiscal),
      valor: hasMissingContractValue(record),
      dataVencimento: !dataVencimento,
      status: isBlank(record.status),
    },
  };
}

export function buildSearchIndex(record, display, businessStatus) {
  return normalizeText(
    [
      display.objeto,
      display.empresa,
      display.contrato,
      display.processo,
      display.modalidade,
      display.gestor,
      display.fiscal,
      display.status,
      record.numeroModalidade,
      record.observacoes,
      record.status,
      businessStatus.label,
    ].join(' '),
  );
}

export function formatContractValue(value) {
  return hasMissingContractValue(value) ? FIELD_FALLBACKS.valor : formatCurrency(value);
}

export function hasMissingContractValue(itemOrValue) {
  const value =
    typeof itemOrValue === 'object' && itemOrValue !== null ? itemOrValue.valor : itemOrValue;
  const amount = toFiniteNumber(value);
  return amount === null || amount <= 0;
}

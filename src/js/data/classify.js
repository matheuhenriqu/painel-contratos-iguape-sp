import {
  CLOSED_STATUS_SLUGS,
  COMPLETED_STATUS_SLUGS,
  FIELD_FALLBACKS,
  INSUFFICIENT_STATUS_SLUGS,
} from '../constants.js';
import { formatDays } from '../utils/format.js';
import { getFieldText, normalizeText } from '../utils/strings.js';

export function classifyContract(record, dataVencimento, diasAtual) {
  const sourceLabel = getFieldText(record.status, FIELD_FALLBACKS.status);
  const statusSlug = normalizeText(record.status);

  if (COMPLETED_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: 'concluido',
      label: 'Concluído',
      sourceLabel,
      group: 'closed',
      prazoBucket: 'concluido',
      rowClass: 'row-closed',
      tone: 'closed',
      timingLabel: 'Contrato concluído',
    };
  }

  if (CLOSED_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: 'encerrado',
      label: 'Encerrado',
      sourceLabel,
      group: 'closed',
      prazoBucket: 'encerrado',
      rowClass: 'row-closed',
      tone: 'closed',
      timingLabel: 'Contrato encerrado',
    };
  }

  if (INSUFFICIENT_STATUS_SLUGS.has(statusSlug)) {
    return {
      key: 'sem-informacao',
      label: FIELD_FALLBACKS.informacao,
      sourceLabel,
      group: 'current',
      prazoBucket: 'insuficiente',
      rowClass: 'row-insufficient',
      tone: 'neutral',
      timingLabel: FIELD_FALLBACKS.informacao,
    };
  }

  if (!dataVencimento || diasAtual === null) {
    return {
      key: 'sem-data',
      label: FIELD_FALLBACKS.dataVencimento,
      sourceLabel,
      group: 'current',
      prazoBucket: 'sem-data',
      rowClass: 'row-no-date',
      tone: 'neutral',
      timingLabel: FIELD_FALLBACKS.dataVencimento,
    };
  }

  if (diasAtual < 0) {
    return {
      key: 'vencido',
      label: 'Vencido',
      sourceLabel,
      group: 'expired',
      prazoBucket: 'vencido',
      rowClass: 'row-expired',
      tone: 'danger',
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual === 0) {
    return {
      key: 'vence-hoje',
      label: 'Vence hoje',
      sourceLabel,
      group: 'current',
      prazoBucket: 'hoje',
      rowClass: 'row-due-today',
      tone: 'warning',
      timingLabel: 'vence hoje',
    };
  }

  if (diasAtual <= 7) {
    return {
      key: 'proximo-de-vencer',
      label: 'Próximo de vencer',
      sourceLabel,
      group: 'current',
      prazoBucket: '30',
      rowClass: 'row-due-soon',
      tone: 'warning',
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual <= 30) {
    return {
      key: 'vence-ate-30',
      label: 'Vence em até 30 dias',
      sourceLabel,
      group: 'current',
      prazoBucket: '30',
      rowClass: 'row-due-soon',
      tone: 'warning',
      timingLabel: formatDays(diasAtual),
    };
  }

  if (diasAtual <= 90) {
    return {
      key: 'vence-31-90',
      label: 'Vence entre 31 e 90 dias',
      sourceLabel,
      group: 'current',
      prazoBucket: '90',
      rowClass: 'row-due-mid',
      tone: 'notice',
      timingLabel: formatDays(diasAtual),
    };
  }

  return {
    key: 'vigente',
    label: 'Vigente',
    sourceLabel,
    group: 'current',
    prazoBucket: 'futuro',
    rowClass: 'row-current',
    tone: 'ok',
    timingLabel: formatDays(diasAtual),
  };
}

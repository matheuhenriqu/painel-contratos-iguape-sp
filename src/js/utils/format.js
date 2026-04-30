import { FIELD_FALLBACKS } from '../constants.js';

export const currency = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

export const numberFormat = new Intl.NumberFormat('pt-BR');
export const dateFormat = new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' });
export const monthFormat = new Intl.DateTimeFormat('pt-BR', {
  month: 'short',
  year: '2-digit',
  timeZone: 'UTC',
});

export function formatDate(date, fallback = FIELD_FALLBACKS.dataVencimento) {
  return date ? dateFormat.format(date) : fallback;
}

export function formatUpdatedAt(value, withSeconds = false) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
  });
}

export function formatShortUpdatedAt(value) {
  if (!value) return 'Sem data';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Sem data';
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

export function formatDays(days) {
  if (days === null || Number.isNaN(days)) return FIELD_FALLBACKS.dataVencimento;
  if (days < 0) return `vencido há ${formatDayCount(Math.abs(days))}`;
  if (days === 0) return 'vence hoje';
  return `vence em ${formatDayCount(days)}`;
}

export function formatDayCount(days) {
  return days === 1 ? '1 dia' : `${days} dias`;
}

export function toFiniteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function compactCurrency(value, fallback = FIELD_FALLBACKS.valor) {
  const amount = toFiniteNumber(value);
  if (amount === null) return fallback;
  const abs = Math.abs(amount);
  if (abs >= 1_000_000) {
    const digits = abs >= 100_000_000 ? 0 : 1;
    return `R$ ${(amount / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: digits })} mi`;
  }
  if (abs >= 1_000) {
    return `R$ ${(amount / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} mil`;
  }
  return currency.format(amount);
}

export function formatCurrency(value, fallback = FIELD_FALLBACKS.valor) {
  const amount = toFiniteNumber(value);
  return amount === null ? fallback : currency.format(amount);
}

export function getPercent(count, total) {
  return total > 0 ? (count / total) * 100 : 0;
}

export function formatPercent(count, total) {
  return `${getPercent(count, total).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
}

export function formatFileDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function capitalizeFirst(value) {
  const text = String(value || '');
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : text;
}

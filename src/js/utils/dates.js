import { MS_PER_DAY } from '../constants.js';

export function parseDate(value) {
  if (!value) return null;
  const match = String(value)
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, yearText, monthText, dayText] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  if (!year || !month || !day) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function startOfDay(date) {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
}

export function calculateDaysUntil(date, baseDate) {
  if (!date) return null;
  return Math.ceil((date - baseDate) / MS_PER_DAY);
}

export function isToday(date, baseDate = startOfDay(new Date())) {
  return Boolean(date && calculateDaysUntil(date, baseDate) === 0);
}

export function isWithinRange(value, min, max) {
  return value !== null && value >= min && value <= max;
}

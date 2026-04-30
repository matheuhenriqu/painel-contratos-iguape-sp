import { toFiniteNumber } from './format.js';
import { compactSearchText, normalizeText } from './strings.js';

const OPERATOR_FIELDS = new Set([
  'empresa',
  'status',
  'modalidade',
  'valor',
  'vencimento',
  'gestor',
  'fiscal',
]);
const TEXT_OPERATOR_FIELDS = new Set(['empresa', 'status', 'modalidade', 'gestor', 'fiscal']);

export function matchesSearchQuery(item, query) {
  const parsed = parseSearchQuery(query);
  if (parsed.operators.length) {
    return (
      parsed.operators.every((operator) => matchesOperator(item, operator)) &&
      matchesPlainTerms(item, parsed.terms)
    );
  }

  return matchesPlainTerms(item, parsed.terms, { fuzzy: true });
}

export function parseSearchQuery(query) {
  const tokens = tokenizeSearch(query);
  const operators = [];
  const terms = [];

  tokens.forEach((token) => {
    const match = token.match(/^([a-zA-ZçÇãÃõÕáÁéÉíÍóÓúÚâÂêÊôÔ]+):(.+)$/);
    if (!match) {
      terms.push(token);
      return;
    }

    const field = normalizeText(match[1]);
    if (!OPERATOR_FIELDS.has(field)) {
      terms.push(token);
      return;
    }

    operators.push({ field, value: stripQuotes(match[2]) });
  });

  return { operators, terms };
}

export function hasSearchOperators(query) {
  return parseSearchQuery(query).operators.length > 0;
}

function tokenizeSearch(query) {
  const tokens = [];
  const pattern = /(?:[^\s"]+:"[^"]+"|"[^"]+"|\S+)/g;
  String(query ?? '').replace(pattern, (token) => {
    tokens.push(token);
    return token;
  });
  return tokens;
}

function stripQuotes(value) {
  return String(value ?? '')
    .replace(/^"|"$/g, '')
    .trim();
}

function matchesOperator(item, operator) {
  if (TEXT_OPERATOR_FIELDS.has(operator.field)) {
    return getOperatorText(item, operator.field).includes(normalizeText(operator.value));
  }

  if (operator.field === 'valor') return matchesValueOperator(item, operator.value);
  if (operator.field === 'vencimento') return matchesDueDateOperator(item, operator.value);
  return true;
}

function getOperatorText(item, field) {
  const values = {
    empresa: item.display.empresa,
    status: `${item.businessStatus.label} ${item.businessStatus.key} ${item.businessStatus.prazoBucket} ${item.businessStatus.group === 'closed' ? 'fechado encerrado concluido' : ''}`,
    modalidade: item.display.modalidade,
    gestor: item.display.gestor,
    fiscal: item.display.fiscal,
  };
  return normalizeText(values[field]);
}

function matchesValueOperator(item, value) {
  const match = String(value)
    .trim()
    .match(/^(>=|<=|>|<|=)?\s*(.+)$/);
  if (!match) return true;
  const operator = match[1] || '=';
  const expected = parseNumber(match[2]);
  const actual = toFiniteNumber(item.valor) ?? 0;
  if (expected === null) return true;

  if (operator === '>') return actual > expected;
  if (operator === '>=') return actual >= expected;
  if (operator === '<') return actual < expected;
  if (operator === '<=') return actual <= expected;
  return actual === expected;
}

function matchesDueDateOperator(item, value) {
  if (normalizeText(value) === 'sem-data') return !item.dataVencimentoDate;
  if (!item.dataVencimentoDate) return false;

  const [startText, endText] = String(value).split('..');
  const start = parseDateBoundary(startText, 'start');
  const end = parseDateBoundary(endText || startText, 'end');
  const due = item.dataVencimentoDate.getTime();

  if (!start || !end) return true;
  return due >= start.getTime() && due <= end.getTime();
}

function parseDateBoundary(value, mode) {
  const text = String(value ?? '').trim();
  const monthMatch = text.match(/^(\d{4})-(\d{2})$/);
  if (monthMatch) {
    const year = Number(monthMatch[1]);
    const month = Number(monthMatch[2]);
    return mode === 'start'
      ? new Date(Date.UTC(year, month - 1, 1))
      : new Date(Date.UTC(year, month, 0));
  }

  const dayMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dayMatch) {
    return new Date(Date.UTC(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3])));
  }

  return null;
}

function matchesPlainTerms(item, terms, options = {}) {
  if (!terms.length) return true;
  return terms.every((term) => {
    const normalizedTerm = normalizeText(stripQuotes(term));
    const compactTerm = compactSearchText(normalizedTerm);
    if (!normalizedTerm) return true;
    if (
      item.normalized.includes(normalizedTerm) ||
      Boolean(compactTerm && item.normalizedCompact.includes(compactTerm))
    ) {
      return true;
    }
    return options.fuzzy ? matchesFuzzyTerm(item, normalizedTerm) : false;
  });
}

function matchesFuzzyTerm(item, term) {
  if (term.length < 3) return false;
  const words = item.normalized
    .split(/\s+/)
    .filter((word) => Math.abs(word.length - term.length) <= 2);
  return words.some((word) => levenshteinDistance(word, term) <= 2);
}

export function levenshteinDistance(a, b) {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[b.length];
}

function parseNumber(value) {
  const normalized = String(value ?? '')
    .replace(/[R$\s.]/g, '')
    .replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
}

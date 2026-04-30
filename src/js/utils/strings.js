export function unique(values) {
  return [...new Set(values.map((value) => value || '').filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }),
  );
}

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function compactSearchText(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, '');
}

export function getSearchTerms(value) {
  return normalizeText(value).split(/\s+/).filter(Boolean);
}

export function matchesSearchTerms(item, terms) {
  return terms.every((term) => {
    const compactTerm = compactSearchText(term);
    return (
      item.normalized.includes(term) ||
      Boolean(compactTerm && item.normalizedCompact.includes(compactTerm))
    );
  });
}

export function getFieldText(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

export function isBlank(value) {
  return String(value ?? '').trim() === '';
}

export function slugifyClassName(value) {
  return normalizeText(value)
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

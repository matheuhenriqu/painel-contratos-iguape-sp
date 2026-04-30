import { describe, expect, it } from 'vitest';
import {
  levenshteinDistance,
  matchesSearchQuery,
  parseSearchQuery,
} from '../../../src/js/utils/search.js';
import {
  compactSearchText,
  getFieldText,
  getSearchTerms,
  isBlank,
  normalizeText,
  slugifyClassName,
  unique,
} from '../../../src/js/utils/strings.js';
import { makeNormalizedRows, makeSourceRecord } from '../helpers/records.js';

describe('strings', () => {
  it('normaliza acentos, termos e classes', () => {
    expect(normalizeText(' São José  ')).toBe('sao jose');
    expect(compactSearchText('CT 001/2026')).toBe('ct0012026');
    expect(getSearchTerms('  limpeza pública  ')).toEqual(['limpeza', 'publica']);
    expect(unique(['b', 'Á', 'a'])).toEqual(['Á', 'a', 'b']);
    expect(getFieldText('', 'fallback')).toBe('fallback');
    expect(isBlank('   ')).toBe(true);
    expect(slugifyClassName('Próximo de vencer!')).toBe('proximo-de-vencer');
  });
});

describe('search', () => {
  const [item] = makeNormalizedRows([
    makeSourceRecord({
      empresa: 'São José Serviços',
      modalidade: 'Pregão Eletrônico',
      valor: 75000,
      dataVencimento: '2026-03-15',
      gestor: 'Maria',
      fiscal: 'João',
    }),
  ]);

  it('interpreta operadores de busca avançada', () => {
    expect(
      parseSearchQuery('empresa:"São José" valor:>50000 vencimento:2026-03..2026-06').operators,
    ).toHaveLength(3);
    expect(matchesSearchQuery(item, 'empresa:"sao jose" modalidade:pregao valor:>=75000')).toBe(
      true,
    );
    expect(matchesSearchQuery(item, 'valor:<1000')).toBe(false);
    expect(matchesSearchQuery(item, 'vencimento:2026-03')).toBe(true);
    expect(matchesSearchQuery(item, 'gestor:maria fiscal:joao')).toBe(true);
  });

  it('faz fallback fuzzy quando não há operadores', () => {
    expect(matchesSearchQuery(item, 'servisos')).toBe(true);
    expect(matchesSearchQuery(item, 'termo-inexistente')).toBe(false);
    expect(levenshteinDistance('contrato', 'contrto')).toBe(1);
  });
});

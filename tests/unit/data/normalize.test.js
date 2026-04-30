import { describe, expect, it } from 'vitest';
import {
  buildDisplayFields,
  formatContractValue,
  normalizeRecords,
} from '../../../src/js/data/normalize.js';
import { classifyContract } from '../../../src/js/data/classify.js';
import { parseDate } from '../../../src/js/utils/dates.js';
import { makeSourceRecord } from '../helpers/records.js';

describe('normalizeRecords', () => {
  it('normaliza campos de exibição, datas e índice de busca', () => {
    const [record] = normalizeRecords(
      {
        records: [
          makeSourceRecord({
            contrato: '  CT 001/2026  ',
            objeto: 'Manutenção de iluminação pública',
            empresa: 'São José Serviços',
            dataVencimento: '2026-02-05',
          }),
        ],
      },
      parseDate('2026-01-31'),
    );

    expect(record.display.contrato).toBe('CT 001/2026');
    expect(record.display.empresa).toBe('São José Serviços');
    expect(record.dataVencimentoDate.toISOString()).toContain('2026-02-05');
    expect(record.diasAtual).toBe(5);
    expect(record.businessStatus.label).toBe('Próximo de vencer');
    expect(record.normalized).toContain('sao jose servicos');
    expect(record.normalizedCompact).toContain('saojoseservicos');
  });

  it('mantém fallbacks para null, datas inválidas e valor ausente', () => {
    const [record] = normalizeRecords(
      {
        records: [
          makeSourceRecord({
            contrato: null,
            processo: '',
            valor: null,
            dataVencimento: '2026-02-31',
            gestor: undefined,
          }),
        ],
      },
      parseDate('2026-01-31'),
    );

    expect(record.display.contrato).toBe('Sem contrato informado');
    expect(record.display.processo).toBe('Sem processo informado');
    expect(record.display.valor).toBe('Sem valor informado');
    expect(record.display.dataVencimento).toBe('Sem data de vencimento');
    expect(record.display.isMissing.gestor).toBe(true);
    expect(record.dataVencimentoDate).toBeNull();
  });

  it('formata valor de contrato e campos de display isoladamente', () => {
    const businessStatus = classifyContract(makeSourceRecord(), parseDate('2026-12-31'), 10);
    const display = buildDisplayFields(
      makeSourceRecord({ empresa: '  Empresa A  ', valor: 0 }),
      parseDate('2026-12-31'),
      businessStatus,
    );

    expect(formatContractValue(1234)).toBe('R$ 1.234');
    expect(formatContractValue(0)).toBe('Sem valor informado');
    expect(display.empresa).toBe('Empresa A');
    expect(display.isMissing.valor).toBe(true);
  });
});

import { FIELD_FALLBACKS, SELECT_ALL } from '../constants.js';
import { formatFileDate, numberFormat, toFiniteNumber } from '../utils/format.js';
import { getFieldText } from '../utils/strings.js';

export const EXPORT_COLUMNS = [
  ['id', 'ID'],
  ['contrato', 'Contrato'],
  ['processo', 'Processo'],
  ['objeto', 'Objeto'],
  ['empresa', 'Empresa'],
  ['modalidade', 'Modalidade'],
  ['valor', 'Valor numérico'],
  ['valorFormatado', 'Valor'],
  ['dataVencimento', 'Data de vencimento'],
  ['diasAtual', 'Dias até o vencimento'],
  ['statusPainel', 'Status do painel'],
  ['statusPlanilha', 'Status da planilha'],
  ['gestor', 'Gestor'],
  ['fiscal', 'Fiscal'],
  ['observacoes', 'Observações'],
];

const CANONICAL_RECORD_KEYS = [
  'id',
  'modalidade',
  'numeroModalidade',
  'objeto',
  'processo',
  'contrato',
  'empresa',
  'valor',
  'valorDescricao',
  'dataInicio',
  'dataVencimento',
  'diasPlanilha',
  'status',
  'gestor',
  'fiscal',
  'observacoes',
];

export function getRowsForExport({ viewState }) {
  return [...viewState.currentRows, ...viewState.expiredRows, ...viewState.completedRows];
}

export function getGroupedRowsForExport({ viewState }) {
  return [
    ['Vigentes', viewState.currentRows],
    ['Vencidos', viewState.expiredRows],
    ['Encerrados', viewState.completedRows],
  ];
}

export function getExportField(item, key) {
  const values = {
    id: item.id ?? '',
    contrato: item.display.contrato,
    processo: item.display.processo,
    objeto: item.display.objeto,
    empresa: item.display.empresa,
    modalidade: item.display.modalidade,
    valor: toFiniteNumber(item.valor) ?? '',
    valorFormatado: item.display.valor,
    dataVencimento: item.dataVencimento || FIELD_FALLBACKS.dataVencimento,
    diasAtual: item.diasAtual ?? '',
    statusPainel: item.businessStatus.label,
    statusPlanilha: item.display.statusSource,
    gestor: item.display.gestor,
    fiscal: item.display.fiscal,
    observacoes: getFieldText(item.observacoes, ''),
  };
  return values[key] ?? '';
}

export function toCanonicalRecord(item) {
  return CANONICAL_RECORD_KEYS.reduce((record, key) => {
    record[key] = normalizeCanonicalValue(item[key]);
    return record;
  }, {});
}

export function buildExportDataset(context, rows = getRowsForExport(context)) {
  return {
    source: context.sourceData.source,
    sheet: context.sourceData.sheet,
    generatedAt: new Date().toISOString(),
    recordCount: rows.length,
    records: rows.map(toCanonicalRecord),
  };
}

export function buildExportFilename(extension) {
  return `contratos-iguape-recorte-${formatFileDate(new Date())}.${extension}`;
}

export function getFilterEntries({ elements, state }) {
  const entries = [];
  if (state.search) entries.push(['Busca', elements.searchInput.value.trim()]);
  if (state.status !== SELECT_ALL) entries.push(['Status', state.status]);
  if (state.prazo !== SELECT_ALL) {
    entries.push(['Prazo', elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text]);
  }
  if (state.modalidade !== SELECT_ALL) entries.push(['Modalidade', state.modalidade]);
  if (state.gestor !== SELECT_ALL) entries.push(['Gestor', state.gestor]);
  if (state.fiscal !== SELECT_ALL) entries.push(['Fiscal', state.fiscal]);
  if (state.ano !== SELECT_ALL) entries.push(['Ano de vencimento', state.ano]);
  if (!entries.length) entries.push(['Filtros', 'Sem filtros ativos']);
  entries.push([
    'Ordenação',
    `${elements.sortField.options[elements.sortField.selectedIndex].text} (${state.sortDir === 'asc' ? 'crescente' : 'decrescente'})`,
  ]);
  return entries;
}

export function getGenerationEntries(context, rowCount = getRowsForExport(context).length) {
  return [
    [
      'Gerado em',
      new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(
        new Date(),
      ),
    ],
    ['Fonte', context.sourceData.source || 'Sem fonte informada'],
    ['Aba', context.sourceData.sheet || 'Sem aba informada'],
    ['Registros na base', numberFormat.format(context.records.length)],
    ['Registros no recorte', numberFormat.format(rowCount)],
    ['URL', window.location.href],
  ];
}

export function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function normalizeCanonicalValue(value) {
  if (value === undefined || value === '') return null;
  if (Number.isNaN(value)) return null;
  return value;
}

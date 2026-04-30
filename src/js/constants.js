export const SELECT_ALL = 'todos';
export const TABLE_COLUMN_COUNT = 11;
export const MS_PER_DAY = 86_400_000;
export const RENDER_DEBOUNCE_MS = 150;
export const LRU_CACHE_LIMIT = 8;
export const VIRTUAL_TABLE_BUFFER = 10;
export const VIRTUAL_TABLE_THRESHOLD = 100;

export const BREAKPOINTS = {
  small: 720,
  filters: 820,
};

export const STORAGE_KEYS = {
  compactRows: 'contratosIguapeCompactRows',
  viewMode: 'painel.viewMode',
  savedFilters: 'painel.savedFilters',
};

export const URL_PARAM_KEYS = {
  search: 'busca',
  status: 'status',
  modalidade: 'modalidade',
  gestor: 'gestor',
  fiscal: 'fiscal',
  prazo: 'prazo',
  ano: 'ano',
  sortKey: 'ordem',
  sortDir: 'direcao',
  compactRows: 'compacto',
};

export const SORT_KEYS = new Set([
  'id',
  'contrato',
  'processo',
  'objeto',
  'empresa',
  'modalidade',
  'valor',
  'dataVencimento',
  'status',
  'gestor',
  'fiscal',
]);

export const COMPLETED_STATUS_SLUGS = new Set(['concluido', 'finalizado']);
export const CLOSED_STATUS_SLUGS = new Set(['encerrado', 'fracassado', 'nao assinou', 'suspenso']);
export const INSUFFICIENT_STATUS_SLUGS = new Set(['indefinido', 'sem informacao', 'sem status']);

export const FIELD_FALLBACKS = {
  contrato: 'Sem contrato informado',
  processo: 'Sem processo informado',
  objeto: 'Sem objeto informado',
  empresa: 'Sem empresa informada',
  modalidade: 'Sem modalidade informada',
  gestor: 'Sem gestor informado',
  fiscal: 'Sem fiscal informado',
  valor: 'Sem valor informado',
  dataVencimento: 'Sem data de vencimento',
  status: 'Sem status informado',
  informacao: 'Sem informação suficiente',
};

export const QUALITY_FIELDS = [
  { key: 'gestor', label: 'Sem gestor', issue: 'gestor não informado' },
  { key: 'fiscal', label: 'Sem fiscal', issue: 'fiscal não informado' },
  { key: 'dataVencimento', label: 'Sem vencimento', issue: 'data de vencimento não informada' },
  { key: 'valor', label: 'Sem valor', issue: 'valor não informado ou zerado' },
  { key: 'empresa', label: 'Sem empresa', issue: 'empresa não informada' },
];

export const defaultSort = {
  key: 'dataVencimento',
  dir: 'asc',
};

export const pageSize = {
  desktop: 80,
  mobile: 18,
};

export const collator = new Intl.Collator('pt-BR', {
  numeric: true,
  sensitivity: 'base',
});

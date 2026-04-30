const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ALLOWED_SOURCE_STATUSES = new Set([
  'Aguardando',
  'Atenção',
  'Ativo',
  'Em Andamento',
  'Encerrado',
  'Finalizado',
  'Fracassado',
  'Indefinido',
  'Licitando',
  'Não Assinou',
  'Publicado',
  'Suspenso',
  'Vence em breve',
  'Vencido',
]);

export function validateSourceRecords(sourceData) {
  if (!Array.isArray(sourceData?.records)) {
    return [
      { id: 'base', field: 'records', message: 'A base não possui uma lista de registros válida.' },
    ];
  }

  return sourceData.records.flatMap((record, index) => validateRecord(record, index));
}

function validateRecord(record, index) {
  const id = record?.id ?? index + 1;
  const warnings = [];

  if (Number(record?.valor) < 0) {
    warnings.push({ id, field: 'valor', message: 'Valor negativo informado.' });
  }

  ['dataInicio', 'dataVencimento'].forEach((field) => {
    const value = record?.[field];
    if (value !== null && value !== undefined && value !== '' && !isValidIsoDate(value)) {
      warnings.push({ id, field, message: `Data inválida em ${field}. Use AAAA-MM-DD.` });
    }
  });

  const status = record?.status;
  if (
    status !== null &&
    status !== undefined &&
    status !== '' &&
    !ALLOWED_SOURCE_STATUSES.has(String(status))
  ) {
    warnings.push({ id, field: 'status', message: `Status fora da lista esperada: ${status}.` });
  }

  return warnings;
}

function isValidIsoDate(value) {
  if (!ISO_DATE_PATTERN.test(String(value))) return false;
  const [year, month, day] = String(value).split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

import { numberFormat } from '../utils/format.js';
import { showActionFeedback } from './feedback.js';
import {
  EXPORT_COLUMNS,
  buildExportFilename,
  getExportField,
  getRowsForExport,
} from './export-data.js';

export function exportFilteredCsv(context) {
  const rows = getRowsForExport(context);
  if (!rows.length) {
    showActionFeedback(context.elements, 'Não há contratos para exportar neste recorte.');
    return;
  }

  const csv = buildCsv(rows);
  const filename = buildExportFilename('csv');
  downloadTextFile(filename, csv, 'text/csv;charset=utf-8');
  showActionFeedback(
    context.elements,
    `${numberFormat.format(rows.length)} contrato(s) exportado(s) em CSV.`,
  );
}

export function buildCsv(rows) {
  const header = EXPORT_COLUMNS.map(([, label]) => csvValue(label)).join(',');
  const body = rows.map((item) =>
    EXPORT_COLUMNS.map(([key]) => csvValue(getExportField(item, key))).join(','),
  );
  return [header, ...body].join('\r\n');
}

export function csvValue(value) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

export function downloadTextFile(filename, content, type) {
  const blob = new Blob(['\ufeff', content], { type });
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

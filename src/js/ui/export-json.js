import { numberFormat } from '../utils/format.js';
import { showActionFeedback } from './feedback.js';
import {
  buildExportDataset,
  buildExportFilename,
  downloadBlob,
  getRowsForExport,
} from './export-data.js';

export function exportFilteredJson(context) {
  const rows = getRowsForExport(context);
  if (!rows.length) {
    showActionFeedback(context.elements, 'Não há contratos para exportar neste recorte.');
    return;
  }

  const dataset = buildExportDataset(context, rows);
  const json = JSON.stringify(dataset, null, 2);
  downloadBlob(
    buildExportFilename('json'),
    new Blob([json], { type: 'application/json;charset=utf-8' }),
  );
  showActionFeedback(
    context.elements,
    `${numberFormat.format(rows.length)} contrato(s) exportado(s) em JSON.`,
  );
}

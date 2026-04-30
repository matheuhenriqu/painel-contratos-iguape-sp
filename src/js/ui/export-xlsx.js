import { loadVendorScript } from '../utils/load-script.js';
import { numberFormat } from '../utils/format.js';
import { showActionFeedback } from './feedback.js';
import {
  EXPORT_COLUMNS,
  buildExportFilename,
  getExportField,
  getFilterEntries,
  getGenerationEntries,
  getGroupedRowsForExport,
  getRowsForExport,
} from './export-data.js';

export async function exportFilteredXlsx(context) {
  const rows = getRowsForExport(context);
  if (!rows.length) {
    showActionFeedback(context.elements, 'Não há contratos para exportar neste recorte.');
    return;
  }

  try {
    const XLSX = await loadXlsx();
    const workbook = XLSX.utils.book_new();

    getGroupedRowsForExport(context).forEach(([label, groupRows]) => {
      appendContractsSheet(XLSX, workbook, label, groupRows);
    });
    appendKeyValueSheet(XLSX, workbook, 'Filtros aplicados', getFilterEntries(context));
    appendKeyValueSheet(XLSX, workbook, 'Geração', getGenerationEntries(context, rows.length));

    XLSX.writeFile(workbook, buildExportFilename('xlsx'), { compression: true });
    showActionFeedback(
      context.elements,
      `${numberFormat.format(rows.length)} contrato(s) exportado(s) em XLSX.`,
    );
  } catch (error) {
    console.error('Falha ao exportar XLSX.', error);
    showActionFeedback(context.elements, 'Não foi possível gerar o XLSX neste navegador.');
  }
}

async function loadXlsx() {
  await loadVendorScript('assets/vendor/xlsx.full.min.js', 'XLSX');
  if (!window.XLSX) throw new Error('SheetJS não carregado.');
  return window.XLSX;
}

function appendContractsSheet(XLSX, workbook, sheetName, rows) {
  const header = EXPORT_COLUMNS.map(([, label]) => label);
  const data = [
    header,
    ...rows.map((item) => EXPORT_COLUMNS.map(([key]) => getExportField(item, key))),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(data);
  worksheet['!cols'] = buildColumnWidths(header, rows);
  worksheet['!freeze'] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: 'A2',
    activePane: 'bottomLeft',
    state: 'frozen',
  };
  styleHeaderRow(worksheet, header.length);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.slice(0, 31));
}

function appendKeyValueSheet(XLSX, workbook, sheetName, entries) {
  const worksheet = XLSX.utils.aoa_to_sheet([['Campo', 'Valor'], ...entries]);
  worksheet['!cols'] = [{ wch: 24 }, { wch: 96 }];
  worksheet['!freeze'] = {
    xSplit: 0,
    ySplit: 1,
    topLeftCell: 'A2',
    activePane: 'bottomLeft',
    state: 'frozen',
  };
  styleHeaderRow(worksheet, 2);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
}

function buildColumnWidths(header, rows) {
  return header.map((label, index) => {
    const maxLength = rows.reduce((max, item) => {
      const value = getExportField(item, EXPORT_COLUMNS[index][0]);
      return Math.max(max, String(value ?? '').length);
    }, label.length);
    return { wch: Math.min(Math.max(maxLength + 2, 12), 48) };
  });
}

function styleHeaderRow(worksheet, columnCount) {
  for (let column = 0; column < columnCount; column += 1) {
    const cellAddress = `${columnName(column)}1`;
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '16664F' } },
      alignment: { horizontal: 'center' },
    };
  }
}

function columnName(index) {
  let name = '';
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

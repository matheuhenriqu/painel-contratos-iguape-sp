import { loadVendorScript } from '../utils/load-script.js';
import { compactCurrency, numberFormat } from '../utils/format.js';
import { showActionFeedback } from './feedback.js';
import {
  EXPORT_COLUMNS,
  buildExportFilename,
  getExportField,
  getFilterEntries,
  getGroupedRowsForExport,
  getRowsForExport,
} from './export-data.js';

const PDF_COLUMNS = [
  'contrato',
  'empresa',
  'modalidade',
  'valorFormatado',
  'dataVencimento',
  'statusPainel',
  'gestor',
  'fiscal',
];
const PDF_COLUMN_LABELS = PDF_COLUMNS.map(
  (key) => EXPORT_COLUMNS.find(([columnKey]) => columnKey === key)?.[1] || key,
);
const CANONICAL_URL = 'https://matheuhenriqu.github.io/painel-contratos-iguape-sp/';

export async function exportFilteredPdf(context) {
  const rows = getRowsForExport(context);
  if (!rows.length) {
    showActionFeedback(context.elements, 'Não há contratos para exportar neste recorte.');
    return;
  }

  try {
    const jsPDF = await loadPdfVendors();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const logoDataUrl = await getImageDataUrl('assets/apple-touch-icon.png');
    const qrDataUrl = createQrPng(window.location.href);

    renderPdfCover(doc, context, logoDataUrl, qrDataUrl, rows.length);
    renderPdfTables(doc, context);
    renderPdfFooters(doc, qrDataUrl);

    doc.save(buildExportFilename('pdf'));
    showActionFeedback(
      context.elements,
      `${numberFormat.format(rows.length)} contrato(s) exportado(s) em PDF.`,
    );
  } catch (error) {
    console.error('Falha ao exportar PDF.', error);
    showActionFeedback(context.elements, 'Não foi possível gerar o PDF neste navegador.');
  }
}

async function loadPdfVendors() {
  await loadVendorScript('assets/vendor/jspdf.umd.min.js', 'jspdf');
  await loadVendorScript('assets/vendor/jspdf.plugin.autotable.min.js');
  const jsPDF = window.jspdf?.jsPDF || window.jsPDF;
  if (!jsPDF) throw new Error('jsPDF não carregado.');
  return jsPDF;
}

function renderPdfCover(doc, context, logoDataUrl, qrDataUrl, rowCount) {
  const generatedAt = new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date());
  const pageWidth = doc.internal.pageSize.getWidth();
  const metrics = context.viewState.metrics;

  doc.setFillColor(22, 102, 79);
  doc.rect(0, 0, pageWidth, 34, 'F');
  if (logoDataUrl) doc.addImage(logoDataUrl, 'PNG', 12, 7, 20, 20);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text('Relatório de Contratos — Prefeitura Municipal de Iguape/SP', 38, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Recorte aplicado em ${generatedAt}`, 38, 23);

  doc.setTextColor(20, 35, 31);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('Sumário', 12, 44);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    [
      `${numberFormat.format(rowCount)} contrato(s) no recorte.`,
      `Valor filtrado: ${compactCurrency(metrics.filteredValue)}.`,
      `${numberFormat.format(metrics.currentCount)} em acompanhamento, ${numberFormat.format(metrics.expiredCount)} vencido(s), ${numberFormat.format(metrics.closedCount)} encerrado(s)/concluído(s).`,
    ],
    12,
    51,
  );

  doc.setFont('helvetica', 'bold');
  doc.text('Filtros aplicados', 12, 73);
  doc.setFont('helvetica', 'normal');
  doc.text(
    getFilterEntries(context).map(([label, value]) => `${label}: ${value}`),
    12,
    80,
  );

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', pageWidth - 38, 42, 24, 24);
    doc.setFontSize(7);
    doc.text('URL com filtros', pageWidth - 39, 70);
  }
}

function renderPdfTables(doc, context) {
  let startY = 102;
  getGroupedRowsForExport(context).forEach(([title, rows], index) => {
    if (index > 0 || startY > 170) {
      doc.addPage();
      startY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(20, 35, 31);
    doc.text(`${title}: ${numberFormat.format(rows.length)} contrato(s)`, 12, startY);

    doc.autoTable({
      startY: startY + 5,
      head: [PDF_COLUMN_LABELS],
      body: rows.map((item) => PDF_COLUMNS.map((key) => String(getExportField(item, key) ?? ''))),
      styles: { fontSize: 6.8, cellPadding: 1.3, overflow: 'linebreak' },
      headStyles: { fillColor: [22, 102, 79], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [246, 248, 246] },
      margin: { left: 12, right: 12 },
      tableWidth: 'auto',
    });
    startY = doc.lastAutoTable.finalY + 12;
  });
}

function renderPdfFooters(doc, qrDataUrl) {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(210, 210, 210);
    doc.line(12, pageHeight - 13, pageWidth - 12, pageHeight - 13);
    if (qrDataUrl) doc.addImage(qrDataUrl, 'PNG', 12, pageHeight - 11, 8, 8);
    doc.setFontSize(7);
    doc.setTextColor(80, 80, 80);
    doc.text(CANONICAL_URL, 23, pageHeight - 6);
    doc.text(`Página ${page} de ${totalPages}`, pageWidth - 34, pageHeight - 6);
  }
}

async function getImageDataUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return await new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve('');
    reader.readAsDataURL(blob);
  });
}

function createQrPng(text) {
  if (typeof window.qrcode !== 'function') return '';
  const qr = window.qrcode(0, 'M');
  qr.addData(text);
  qr.make();

  const moduleCount = qr.getModuleCount();
  const scale = 4;
  const quietZone = 4;
  const size = (moduleCount + quietZone * 2) * scale;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, size, size);
  context.fillStyle = '#000000';
  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (qr.isDark(row, column)) {
        context.fillRect((column + quietZone) * scale, (row + quietZone) * scale, scale, scale);
      }
    }
  }
  return canvas.toDataURL('image/png');
}

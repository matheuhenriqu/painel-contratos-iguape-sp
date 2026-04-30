import { SELECT_ALL } from '../constants.js';
import { writeClipboard } from '../utils/clipboard.js';
import { formatCurrency, formatUpdatedAt, numberFormat } from '../utils/format.js';
import { getActiveFilterCount } from './filters.js';
import { showActionFeedback } from './feedback.js';

export function renderAutoSummary(context, metrics) {
  const summary = buildTextSummary(context, metrics);
  context.viewState.summaryText = summary;
  context.elements.autoSummary.textContent = summary;
}

export function buildTextSummary(context, metrics) {
  const filterText = getActiveFilterCount(context)
    ? ` Filtros ativos: ${formatActiveFiltersForSummary(context)}.`
    : ' Sem filtros ativos.';
  if (!metrics.filteredContracts) {
    return `Nenhum contrato foi encontrado no recorte atual. Última atualização da base: ${formatUpdatedAt(metrics.updatedAt, true)}.${filterText}`;
  }

  const qualityText = metrics.quality.incompleteCount
    ? ` Há ${numberFormat.format(metrics.quality.incompleteCount)} registro(s) incompleto(s), com destaque para ${numberFormat.format(metrics.withoutFiscal)} sem fiscal e ${numberFormat.format(metrics.withoutManager)} sem gestor.`
    : ' Não há pendências cadastrais no recorte atual.';

  return [
    `O recorte atual contém ${numberFormat.format(metrics.filteredContracts)} contrato(s), somando ${formatCurrency(metrics.filteredValue)}.`,
    `${numberFormat.format(metrics.currentCount)} estão em acompanhamento, ${numberFormat.format(metrics.expiredCount)} estão vencidos e ${numberFormat.format(metrics.closedCount)} estão encerrados ou concluídos.`,
    `${numberFormat.format(metrics.due30)} contrato(s) vencem em até 30 dias e ${numberFormat.format(metrics.due90)} vencem em até 90 dias.`,
    qualityText,
    `Última atualização da base: ${formatUpdatedAt(metrics.updatedAt, true)}.`,
    filterText,
  ].join(' ');
}

export function formatActiveFiltersForSummary({ elements, state }) {
  const filters = [];
  if (state.search) filters.push(`busca "${elements.searchInput.value.trim()}"`);
  if (state.status !== SELECT_ALL) filters.push(`status ${state.status}`);
  if (state.prazo !== SELECT_ALL) {
    filters.push(`prazo ${elements.prazoFilter.options[elements.prazoFilter.selectedIndex].text}`);
  }
  if (state.modalidade !== SELECT_ALL) filters.push(`modalidade ${state.modalidade}`);
  if (state.gestor !== SELECT_ALL) filters.push(`gestor ${state.gestor}`);
  if (state.fiscal !== SELECT_ALL) filters.push(`fiscal ${state.fiscal}`);
  if (state.ano !== SELECT_ALL) filters.push(`ano ${state.ano}`);
  return filters.join('; ');
}

export async function copyCurrentSummary(context) {
  const text =
    context.viewState.summaryText || buildTextSummary(context, context.viewState.metrics);
  const ok = await writeClipboard(text);
  showActionFeedback(
    context.elements,
    ok
      ? 'Resumo copiado para a área de transferência.'
      : 'Não foi possível copiar automaticamente.',
  );
}

export function updateActionControls({ elements, viewState }, rowCount) {
  elements.exportCsvBtn.disabled = rowCount === 0;
  elements.exportXlsxBtn.disabled = rowCount === 0;
  elements.exportPdfBtn.disabled = rowCount === 0;
  elements.exportJsonBtn.disabled = rowCount === 0;
  elements.copySummaryBtn.disabled = !viewState.summaryText;
}

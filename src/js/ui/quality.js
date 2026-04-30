import { getQualityAlerts } from '../data/aggregate.js';
import { escapeAttr, escapeHtml, setSafeHtml } from '../utils/dom.js';
import { formatPercent, numberFormat } from '../utils/format.js';
import { icon } from '../utils/icons.js';

export function renderQuality({ elements }, metrics) {
  const cards = [
    { key: 'gestor', label: 'Sem gestor', icon: 'user-round-x' },
    { key: 'fiscal', label: 'Sem fiscal', icon: 'badge-alert' },
    { key: 'dataVencimento', label: 'Sem vencimento', icon: 'calendar-x' },
    { key: 'valor', label: 'Sem valor', icon: 'badge-dollar-sign' },
    { key: 'incomplete', label: 'Registros incompletos', icon: 'clipboard-x' },
  ];

  setSafeHtml(
    elements.qualityGrid,
    cards
      .map((card) => {
        const count =
          card.key === 'incomplete'
            ? metrics.quality.incompleteCount
            : metrics.quality.counts[card.key];
        const note =
          card.key === 'incomplete' ? 'com pelo menos uma pendência' : 'do recorte atual';
        return `
      <article class="quality-card">
        <span class="quality-icon" aria-hidden="true">${icon(card.icon)}</span>
        <div>
          <span>${escapeHtml(card.label)}</span>
          <strong>${escapeHtml(formatPercent(count, metrics.filteredContracts))}</strong>
          <small>${escapeHtml(numberFormat.format(count))} contrato(s) ${escapeHtml(note)}</small>
        </div>
      </article>
    `;
      })
      .join(''),
  );

  const alerts = getQualityAlerts(metrics, formatPercent);
  setSafeHtml(
    elements.qualityAlerts,
    alerts
      .map(
        (alert) => `
    <p class="quality-alert ${escapeAttr(alert.tone)}">
      ${icon(alert.icon)}
      <span>${escapeHtml(alert.text)}</span>
    </p>
  `,
      )
      .join(''),
  );
}

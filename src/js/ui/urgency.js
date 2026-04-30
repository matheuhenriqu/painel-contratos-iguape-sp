import { SELECT_ALL } from '../constants.js';
import { numberFormat } from '../utils/format.js';
import { applyFilterPatch } from './filters.js';

const SESSION_KEY = 'painel.urgency.dismissed';

export function setupUrgencyBanner(context) {
  const { elements } = context;
  elements.urgencyViewBtn.addEventListener('click', () => {
    applyFilterPatch(
      context,
      {
        search: '',
        status: SELECT_ALL,
        modalidade: SELECT_ALL,
        gestor: SELECT_ALL,
        fiscal: SELECT_ALL,
        prazo: 'critico',
        ano: SELECT_ALL,
      },
      { rawSearch: '', focusFirstRow: true },
    );
  });

  elements.urgencyDismissBtn.addEventListener('click', () => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // A dispensa é apenas por sessão; se falhar, o banner pode voltar no carregamento atual.
    }
    elements.urgencyBanner.hidden = true;
  });
}

export function renderUrgencyBanner({ elements, records }) {
  const count = records.filter(isCriticalContract).length;
  const dismissed = isDismissed();
  elements.urgencyBanner.hidden = dismissed || count === 0;
  elements.urgencyCount.textContent = `${numberFormat.format(count)} contrato(s) crítico(s).`;
}

function isCriticalContract(item) {
  if (item.isClosed) return false;
  return (
    item.businessStatus.prazoBucket === 'vencido' ||
    item.businessStatus.prazoBucket === 'hoje' ||
    item.businessStatus.key === 'proximo-de-vencer'
  );
}

function isDismissed() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

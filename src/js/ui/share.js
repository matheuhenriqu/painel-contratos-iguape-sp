import { writeClipboard } from '../utils/clipboard.js';
import { showActionFeedback } from './feedback.js';

export async function shareCurrentView(context) {
  const title = 'Painel de Contratos — Iguape/SP';
  const url = window.location.href;
  const text =
    'Consulta pública de contratos da Prefeitura Municipal de Iguape/SP com filtros aplicados.';

  try {
    if (canUseWebShare({ title, text, url })) {
      await navigator.share({ title, text, url });
      showActionFeedback(context.elements, 'Link de compartilhamento enviado.');
      return;
    }
  } catch {
    // O usuário pode cancelar o compartilhamento; nesse caso usamos o fallback por cópia.
  }

  const ok = await writeClipboard(url);
  showActionFeedback(
    context.elements,
    ok ? 'Link do recorte copiado.' : 'Não foi possível compartilhar automaticamente.',
  );
}

function canUseWebShare(payload) {
  if (
    !navigator.share ||
    !window.isSecureContext ||
    navigator.userAgent.includes('HeadlessChrome')
  ) {
    return false;
  }
  return !navigator.canShare || navigator.canShare(payload);
}

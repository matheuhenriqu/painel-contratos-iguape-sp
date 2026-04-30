const ACTION_CLEAR_DELAY_MS = 3200;
const RESULT_ANNOUNCE_DELAY_MS = 600;

let actionFeedbackTimer = null;
let resultFeedbackTimer = null;
let lastAnnouncedResult = '';

export function showActionFeedback(elements, message) {
  window.clearTimeout(actionFeedbackTimer);
  announce(elements, message);
  actionFeedbackTimer = window.setTimeout(() => {
    announce(elements, '');
  }, ACTION_CLEAR_DELAY_MS);
}

export function announceFilterResults(elements, count) {
  const message = `${count} ${count === 1 ? 'contrato exibido' : 'contratos exibidos'}.`;
  window.clearTimeout(resultFeedbackTimer);
  resultFeedbackTimer = window.setTimeout(() => {
    if (message === lastAnnouncedResult) return;
    lastAnnouncedResult = message;
    announce(elements, message);
  }, RESULT_ANNOUNCE_DELAY_MS);
}

export function announceStatus(elements, message) {
  window.clearTimeout(actionFeedbackTimer);
  announce(elements, message);
}

function announce(elements, message) {
  if (!elements?.actionFeedback) return;
  elements.actionFeedback.textContent = message;
}

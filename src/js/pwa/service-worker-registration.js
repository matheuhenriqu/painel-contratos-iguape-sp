import { showActionFeedback } from '../ui/feedback.js';

export function setupServiceWorker({ elements }) {
  if (!('serviceWorker' in navigator)) return;

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('service-worker.js');
      setupUpdateFlow(registration, elements);
      console.info('Service Worker registrado para uso offline.');
    } catch (error) {
      console.info('Service Worker indisponível no momento.', error);
    }
  });
}

function setupUpdateFlow(registration, elements) {
  let updateWorker = registration.waiting;
  let isReloading = false;

  if (updateWorker) {
    showUpdateBanner(elements, updateWorker);
  }

  registration.addEventListener('updatefound', () => {
    updateWorker = registration.installing;
    if (!updateWorker) return;

    updateWorker.addEventListener('statechange', () => {
      if (updateWorker?.state === 'installed' && navigator.serviceWorker.controller) {
        showUpdateBanner(elements, updateWorker);
      }
    });
  });

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (isReloading) return;
    isReloading = true;
    window.location.reload();
  });
}

function showUpdateBanner(elements, worker) {
  elements.updateBanner.hidden = false;
  showActionFeedback(elements, 'Uma atualização do painel está disponível.');
  elements.updateNowBtn.onclick = () => {
    elements.updateNowBtn.disabled = true;
    worker.postMessage({ type: 'SKIP_WAITING' });
  };
}

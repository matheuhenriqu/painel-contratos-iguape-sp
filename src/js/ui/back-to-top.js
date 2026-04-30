import { scrollToTop } from './table.js';

let scrollTicking = false;

export function setupBackToTop({ elements }) {
  elements.backToTopBtn.addEventListener('click', scrollToTop);
  window.addEventListener('scroll', () => scheduleBackToTopUpdate(elements), { passive: true });
}

export function scheduleBackToTopUpdate(elements) {
  if (scrollTicking) return;
  scrollTicking = true;
  window.requestAnimationFrame(() => {
    updateBackToTopButton(elements);
    scrollTicking = false;
  });
}

export function updateBackToTopButton(elements) {
  elements.backToTopBtn.hidden = window.scrollY < Math.max(520, window.innerHeight * 0.75);
}

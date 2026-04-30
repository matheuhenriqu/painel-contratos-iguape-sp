export function setupSectionToggles({ elements }) {
  elements.sectionToggleButtons.forEach((button) => {
    button.addEventListener('click', () => toggleSection(button));
  });
}

export function toggleSection(button) {
  const section = button.closest('[data-collapsible-section]');
  const content = document.getElementById(button.getAttribute('aria-controls'));
  if (!section || !content) return;
  const collapsed = section.classList.toggle('is-section-collapsed');
  content.hidden = collapsed;
  button.setAttribute('aria-expanded', String(!collapsed));
  button.setAttribute(
    'aria-label',
    `${collapsed ? 'Expandir' : 'Recolher'} ${section.querySelector('h2')?.textContent || 'seção'}`,
  );
}

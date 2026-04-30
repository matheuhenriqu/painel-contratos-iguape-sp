import { escapeAttr } from './dom.js';

export function icon(name, className = '') {
  const safeName = escapeAttr(name);
  const classes = ['icon', className].filter(Boolean).map(escapeAttr).join(' ');
  return `<svg class="${classes}" aria-hidden="true" focusable="false"><use href="assets/icons/sprite.svg#${safeName}"></use></svg>`;
}

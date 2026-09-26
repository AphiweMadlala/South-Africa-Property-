// Authored icon set: 24px grid, 1.5px stroke, square caps, no fills.
// Every icon is decorative (aria-hidden); the control around it carries the name.

import { raw } from './html.mjs';

const PATHS = {
  arrow: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  'arrow-left': '<path d="M20 12H5M11 6l-6 6 6 6"/>',
  'chevron-left': '<path d="M15 5l-7 7 7 7"/>',
  'chevron-right': '<path d="M9 5l7 7-7 7"/>',
  'chevron-down': '<path d="M5 9l7 7 7-7"/>',
  close: '<path d="M5.5 5.5l13 13M18.5 5.5l-13 13"/>',
  menu: '<path d="M3.5 8h17M3.5 16h17"/>',
  filter: '<path d="M3.5 7h9M16.5 7h4M3.5 17h4M11.5 17h9"/><circle cx="14.5" cy="7" r="2"/><circle cx="9.5" cy="17" r="2"/>',
  grid: '<path d="M4 4h6.5v6.5H4zM13.5 4H20v6.5h-6.5zM4 13.5h6.5V20H4zM13.5 13.5H20V20h-6.5z"/>',
  instagram: '<rect x="3.75" y="3.75" width="16.5" height="16.5" rx="4.5"/><circle cx="12" cy="12" r="3.9"/><path d="M17.1 6.9h.01"/>',
  mail: '<path d="M3.75 5.75h16.5v12.5H3.75z"/><path d="M4 6.5l8 6.5 8-6.5"/>',
  message: '<path d="M4.5 19.5l1.2-3.6A7.75 7.75 0 1 1 8.6 18.6z"/>',
  external: '<path d="M13.5 4.5h6v6M19.5 4.5l-8.5 8.5M18 13.5v6H4.5V6h6"/>',
};

export function icon(name, { size = 20, className = 'icon' } = {}) {
  const body = PATHS[name];
  if (!body) throw new Error(`unknown icon ${name}`);
  return raw(
    `<svg class="${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="square" stroke-linejoin="miter" aria-hidden="true" focusable="false">${body}</svg>`,
  );
}

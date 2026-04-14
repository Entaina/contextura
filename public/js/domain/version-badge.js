/**
 * Maps a Git history version to a badge descriptor (icon + class + tooltip).
 * Pure function, no DOM, no globals.
 */

/**
 * @typedef {Object} HistoryVersion
 * @property {string} status Git status code: A|M|R|C|T.
 * @property {number} [similarity] Only present for R/C (0-100).
 */

/**
 * @typedef {Object} VersionBadge
 * @property {string} icon SVG markup for the icon (may be concatenated).
 * @property {string} className CSS class to apply to the badge container.
 * @property {string} tooltip Spanish tooltip text.
 */

const ICON = {
  add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  edit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>',
  move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h5l2 2h11v10a2 2 0 0 1-2 2H3z"/><path d="M10 14l3-3 3 3M13 11v7"/></svg>',
  copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>',
}

/**
 * Returns the badge descriptor for a version's change type.
 *
 * @param {HistoryVersion} version
 * @returns {VersionBadge}
 */
export function versionTypeBadge (version) {
  const s = version.status
  const sim = version.similarity
  if (s === 'A') return { icon: ICON.add, className: 'type-add', tooltip: 'Creación del archivo' }
  if (s === 'R' && sim === 100) return { icon: ICON.move, className: 'type-move', tooltip: 'Solo cambió la ubicación' }
  if (s === 'R') return { icon: ICON.move + ICON.edit, className: 'type-move-edit', tooltip: 'Movido y editado' }
  if (s === 'C') return { icon: ICON.copy, className: 'type-copy', tooltip: 'Copiado desde otra ruta' }
  return { icon: ICON.edit, className: 'type-edit', tooltip: 'Edición' }
}

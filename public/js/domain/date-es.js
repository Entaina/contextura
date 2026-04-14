/**
 * Spanish date/author formatting helpers. Pure functions, no DOM, no globals.
 * Used by the history view to render commit timelines.
 */

/**
 * Human-readable relative time in Spanish (e.g. "hace 3 minutos", "ayer").
 *
 * @param {string} dateIso ISO-8601 date string.
 * @returns {string}
 */
export function relativeTimeEs (dateIso) {
  const now = new Date()
  const then = new Date(dateIso)
  const diffSec = Math.round((now - then) / 1000)
  if (diffSec < 60) return 'hace unos segundos'
  const diffMin = Math.round(diffSec / 60)
  if (diffMin < 60) return `hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`
  const diffH = Math.round(diffMin / 60)
  if (diffH < 24) return `hace ${diffH} hora${diffH === 1 ? '' : 's'}`
  const diffD = Math.round(diffH / 24)
  if (diffD === 1) return 'ayer'
  if (diffD < 7) return `hace ${diffD} días`
  const diffW = Math.round(diffD / 7)
  if (diffW < 5) return `hace ${diffW} semana${diffW === 1 ? '' : 's'}`
  const diffMo = Math.round(diffD / 30)
  if (diffMo < 12) return `hace ${diffMo} ${diffMo === 1 ? 'mes' : 'meses'}`
  const diffY = Math.round(diffD / 365)
  return `hace ${diffY} año${diffY === 1 ? '' : 's'}`
}

/**
 * Full locale-specific date and time in Spanish.
 *
 * @param {string} dateIso ISO-8601 date string.
 * @returns {string}
 */
export function absoluteDateEs (dateIso) {
  const d = new Date(dateIso)
  return d.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Extract the first word of a full name for compact author display.
 * Returns "Desconocido" for empty input.
 *
 * @param {string | null | undefined} fullName
 * @returns {string}
 */
export function firstName (fullName) {
  if (!fullName) return 'Desconocido'
  return fullName.split(/\s+/)[0]
}

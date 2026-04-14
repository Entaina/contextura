/**
 * Thin wrapper over `EventSource('/sse')`. The server pushes one event type:
 * `{ type: 'change', path: string }`. Callers provide a single handler that
 * runs on every change event — everything else (how to refresh the tree,
 * which panels to reload, how to invalidate history caches) stays in the
 * caller so this module has zero knowledge of the rest of the app.
 */

/**
 * @typedef {Object} SSEChangeEvent
 * @property {'change'} type
 * @property {string} path Repo-relative path of the file that changed.
 */

/**
 * Open the SSE connection and invoke `onChange` for every `change` event.
 * Returns the underlying EventSource so the caller can `.close()` it on teardown.
 *
 * @param {(evt: SSEChangeEvent) => void} onChange
 * @returns {EventSource}
 */
export function connectSSE (onChange) {
  const es = new EventSource('/sse')
  es.onmessage = (e) => {
    const data = JSON.parse(e.data)
    if (data.type === 'change') onChange(data)
  }
  return es
}

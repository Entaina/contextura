/**
 * File tree store. Holds the current tree loaded from the backend and
 * exposes read/write access plus a path lookup. The shape of a node matches
 * what `/api/tree` returns (see `api.js :: TreeNode`).
 *
 * No subscription mechanism yet — callers explicitly re-render after mutating.
 * If that gets painful, add a `subscribe()` layer in a later phase.
 */

/** @typedef {import('../api.js').TreeNode} TreeNode */

/** @type {TreeNode[]} */
let _tree = []

export const treeStore = {
  /** @returns {TreeNode[]} */
  get: () => _tree,
  /** @param {TreeNode[]} nodes */
  set: (nodes) => { _tree = nodes },
  /**
   * Depth-first lookup for a node with the given path, in the current tree.
   * @param {string} path
   * @returns {TreeNode | null}
   */
  findByPath: (path) => findNodeByPath(_tree, path),
}

/**
 * Pure depth-first search for a node by path in an arbitrary node list.
 * Exported so callers that already hold a subtree can reuse it.
 *
 * @param {TreeNode[]} nodes
 * @param {string} path
 * @returns {TreeNode | null}
 */
export function findNodeByPath (nodes, path) {
  for (const node of nodes) {
    if (node.path === path) return node
    if (node.children) {
      const f = findNodeByPath(node.children, path)
      if (f) return f
    }
  }
  return null
}

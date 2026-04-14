/**
 * File tree store. Holds the tree loaded from `/api/tree` (see
 * `api.js :: TreeNode`) and exposes read/write access plus a path lookup.
 * Callers re-render explicitly after mutating — no subscription layer.
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

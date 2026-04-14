/**
 * Filesystem scanner — builds a recursive tree of markdown files
 * respecting the same exclusions as .indexignore.
 */

import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Parse .indexignore — extracts base directory names to exclude.
function loadExclusions(rootPath) {
  try {
    const content = readFileSync(join(rootPath, '.indexignore'), 'utf-8');
    return new Set(
      content
        .split('\n')
        .map(line => line.trim().replace(/^(\*\*\/)?/, '').replace(/\/$/, ''))
        .filter(line => line && !line.startsWith('#'))
    );
  } catch {
    return new Set(['.git', '.claude', '.obsidian', 'node_modules', 'tools', 'Archive']);
  }
}

function isDirectory(filePath) {
  try {
    return statSync(filePath).isDirectory();
  } catch {
    return false;
  }
}

function scanDir(dirPath, relativePath, excluded) {
  let entries;
  try {
    entries = readdirSync(dirPath).sort();
  } catch {
    return [];
  }

  const children = [];

  for (const name of entries) {
    if (excluded.has(name)) continue;

    const fullPath = join(dirPath, name);
    const relPath = relativePath ? `${relativePath}/${name}` : name;

    if (isDirectory(fullPath)) {
      const subChildren = scanDir(fullPath, relPath, excluded);
      // Include directory only if it contains at least one .md file (recursively)
      if (subChildren.length > 0) {
        children.push({ name, type: 'dir', path: relPath, children: subChildren });
      }
    } else if (name.endsWith('.md')) {
      children.push({ name, type: 'file', path: relPath });
    }
  }

  return children;
}

export function buildTree(rootPath) {
  const excluded = loadExclusions(rootPath);
  return scanDir(rootPath, '', excluded);
}

// Flatten the tree into a map of filename → path for wikilink resolution
export function buildFileIndex(tree, index = {}) {
  for (const node of tree) {
    if (node.type === 'file') {
      // Index by full name (e.g. "index.md") and by stem (e.g. "index")
      const stem = node.name.replace(/\.md$/, '');
      index[node.name] = node.path;
      index[stem] = node.path;
    } else if (node.children) {
      buildFileIndex(node.children, index);
    }
  }
  return index;
}

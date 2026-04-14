/**
 * git-history.mjs — Wrapper sobre `git` CLI para obtener historial, contenido
 * en una revisión concreta y diffs unificados de ficheros individuales.
 *
 * Todas las funciones son async y aceptan `absPath` (absoluto) + `rootPath`.
 * Internamente convierten la ruta a relativa respecto a `rootPath` y ejecutan
 * `git` con `cwd: rootPath`.
 */

import { execFile } from 'node:child_process';
import { relative, sep } from 'node:path';

const FIELD_SEP = '\x1f';
const RECORD_SEP = '\x1e';

function run(args, rootPath, { maxBuffer = 10 * 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    execFile('git', args, { cwd: rootPath, maxBuffer }, (err, stdout, stderr) => {
      if (err) {
        err.stderr = stderr;
        reject(err);
        return;
      }
      resolve(stdout);
    });
  });
}

function toRel(absPath, rootPath) {
  const rel = relative(rootPath, absPath);
  if (!rel || rel.startsWith('..')) {
    throw new Error('Path is outside the repository root');
  }
  // git always uses forward slashes
  return rel.split(sep).join('/');
}

/**
 * Returns an array of versions (commits) that touched the given file, newest
 * first. Uses --follow to track renames.
 *
 * @returns {Promise<Array<{sha: string, shortSha: string, authorName: string, authorEmail: string, dateIso: string, subject: string}>>}
 */
export async function getFileHistory(absPath, rootPath, { limit = 50 } = {}) {
  const relPath = toRel(absPath, rootPath);
  // RECORD_SEP marker precedes each commit's header so we can split reliably.
  // --name-status with --follow emits the change type + paths for the file
  // _as of that commit_ on its own line after the header + a blank line.
  const format = RECORD_SEP + ['%H', '%h', '%an', '%ae', '%aI', '%s'].join(FIELD_SEP);

  let stdout;
  try {
    stdout = await run(
      [
        'log',
        '--follow',
        `--max-count=${limit}`,
        `--pretty=format:${format}`,
        '--name-status',
        '--',
        relPath,
      ],
      rootPath
    );
  } catch (err) {
    return [];
  }

  if (!stdout.trim()) return [];

  return stdout
    .split(RECORD_SEP)
    .map(r => r.replace(/^\n+|\n+$/g, ''))
    .filter(Boolean)
    .map(record => {
      const lines = record.split('\n').filter(Boolean);
      const header = lines[0];
      const statusLine = lines[1] || '';
      const [sha, shortSha, authorName, authorEmail, dateIso, ...rest] = header.split(FIELD_SEP);

      // Parse status line: "A\t<path>" / "M\t<path>" / "R100\t<old>\t<new>" / "C074\t<old>\t<new>"
      const parts = statusLine.split('\t');
      const statusRaw = parts[0] || '';
      const status = statusRaw[0] || 'M';
      const simMatch = /^[RC](\d+)$/.exec(statusRaw);
      const similarity = simMatch ? parseInt(simMatch[1], 10) : null;
      const tailPaths = parts.slice(1).filter(Boolean);
      const path = tailPaths.length > 0 ? tailPaths[tailPaths.length - 1] : relPath;
      const oldPath = tailPaths.length === 2 ? tailPaths[0] : null;

      return {
        sha,
        shortSha,
        authorName,
        authorEmail,
        dateIso,
        subject: rest.join(FIELD_SEP),
        path,
        status,
        similarity,
        oldPath,
      };
    });
}

/**
 * Returns the uncommitted state of a file vs HEAD: whether the working tree
 * differs from the index/HEAD and whether the file is untracked.
 *
 * Uses `git status --porcelain -- <path>` which outputs:
 *   " M path"  → modified in working tree
 *   "M  path"  → staged
 *   "MM path"  → both
 *   "?? path"  → untracked
 *   "A  path"  → staged addition
 *   ""         → clean
 *
 * @returns {Promise<{hasChanges: boolean, untracked: boolean}>}
 */
export async function getUncommittedStatus(absPath, rootPath) {
  let relPath;
  try {
    relPath = toRel(absPath, rootPath);
  } catch {
    return { hasChanges: false, untracked: false };
  }
  try {
    const stdout = await run(['status', '--porcelain', '--', relPath], rootPath);
    const trimmed = stdout.replace(/\n+$/, '');
    if (!trimmed) return { hasChanges: false, untracked: false };
    const firstLine = trimmed.split('\n')[0] || '';
    const indicator = firstLine.slice(0, 2);
    return {
      hasChanges: true,
      untracked: indicator === '??',
    };
  } catch {
    return { hasChanges: false, untracked: false };
  }
}

/**
 * Returns the content of a file at a specific commit. Returns null if the
 * file did not exist at that commit.
 *
 * @returns {Promise<string | null>}
 */
export async function getFileAtRevision(absPath, rootPath, sha, revPath = null) {
  const relPath = revPath || toRel(absPath, rootPath);
  try {
    return await run(['show', `${sha}:${relPath}`], rootPath);
  } catch (err) {
    return null;
  }
}

/**
 * Returns a unified diff of the file between two revisions. If `baseSha` is
 * 'working' (default), compares against the working tree.
 *
 * @returns {Promise<string>}
 */
export async function getFileDiff(absPath, rootPath, sha, baseSha = 'working') {
  const relPath = toRel(absPath, rootPath);
  const args = ['diff', '--no-color'];
  if (baseSha === 'working') {
    // Diff from historical version to current working tree.
    // Order: old..new  → `git diff <sha> -- <path>` shows old→working.
    args.push(sha);
  } else {
    args.push(sha, baseSha);
  }
  args.push('--', relPath);

  try {
    return await run(args, rootPath);
  } catch (err) {
    return '';
  }
}

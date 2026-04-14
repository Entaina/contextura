import { execFile } from 'node:child_process'
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { promisify } from 'node:util'

const run = promisify(execFile)

async function git (cwd, args) {
  return run('git', args, {
    cwd,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Contextura Test',
      GIT_AUTHOR_EMAIL: 'test@contextura.local',
      GIT_COMMITTER_NAME: 'Contextura Test',
      GIT_COMMITTER_EMAIL: 'test@contextura.local',
    },
  })
}

export async function createTmpGitRepo () {
  const dir = await mkdtemp(join(tmpdir(), 'contextura-repo-'))
  await git(dir, ['init', '--quiet', '-b', 'main'])
  await git(dir, ['config', 'commit.gpgsign', 'false'])

  async function writeFileAt (relPath, contents) {
    const abs = join(dir, relPath)
    await mkdir(dirname(abs), { recursive: true })
    await writeFile(abs, contents, 'utf-8')
    return abs
  }

  async function commit (message, files = {}) {
    for (const [relPath, contents] of Object.entries(files)) {
      await writeFileAt(relPath, contents)
    }
    await git(dir, ['add', '-A'])
    await git(dir, ['commit', '--quiet', '--allow-empty', '-m', message])
    const { stdout } = await git(dir, ['rev-parse', 'HEAD'])
    return stdout.trim()
  }

  return {
    path: dir,
    writeFile: writeFileAt,
    commit,
    git: (args) => git(dir, args),
    async cleanup () {
      await rm(dir, { recursive: true, force: true })
    },
  }
}

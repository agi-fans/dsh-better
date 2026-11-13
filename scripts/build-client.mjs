import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const entry = path.join(rootDir, 'src/client/index.ts')
const outFile = path.join(rootDir, 'dist/client.js')

const result = spawnSync('bun', ['build', entry, '--outfile', outFile, '--target', 'browser', '--format', 'iife'], {
  cwd: rootDir,
  stdio: 'inherit',
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}

const built = readFileSync(outFile, 'utf8')
if (!built.includes('__ModuleLoader__.load')) {
  console.error('build-client: dist/client.js missing window.__ModuleLoader__.load registration')
  process.exit(1)
}
if (!built.includes(pkg.name)) {
  console.error(`build-client: dist/client.js missing package id "${pkg.name}"`)
  process.exit(1)
}
if (/^\s*import\s+/m.test(built) || /\brequire\(['"](?!react['"])/.test(built)) {
  console.error('build-client: dist/client.js contains disallowed non-react external imports')
  process.exit(1)
}

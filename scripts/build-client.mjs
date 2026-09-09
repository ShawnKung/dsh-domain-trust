import { build } from 'esbuild'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const temporary = resolve(root, '.build/client.cjs')
const manifest = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
await mkdir(dirname(temporary), { recursive: true })

await build({
  entryPoints: [resolve(root, 'src/client.js')],
  outfile: temporary,
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2022',
  external: ['react'],
  minify: false,
  legalComments: 'none',
})

const body = await readFile(temporary, 'utf8')
const output = `window.__ModuleLoader__.load({
  id: ${JSON.stringify(manifest.name)},
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
${body.split('\n').map(line => `    ${line}`).join('\n')}
    return module.exports;
  }
});
`

await writeFile(resolve(root, 'client.js'), output)
await rm(resolve(root, '.build'), { recursive: true, force: true })

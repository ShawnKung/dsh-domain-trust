import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const source = await readFile(new URL('../src/client.js', import.meta.url), 'utf8')

test('client registers the DSH 0.2 plugin row configuration entry', () => {
  assert.match(source, /ctx\.slots\.inject\('plugins\.row\.config'/)
  assert.match(source, /const ROW_CONFIG_KEY = `\$\{NS\}#\$\{NS\}`/)
  assert.match(source, /key: ROW_CONFIG_KEY/)
})

test('client keeps the legacy settings slot during the transition', () => {
  assert.match(source, /ctx\.slots\.inject\('settings\.plugin\.item'/)
})

test('plugin row configuration supports summary and page views', () => {
  assert.match(source, /view === 'summary'/)
  assert.match(source, /view === 'page'/)
  assert.match(source, /pageForm\?\.state/)
  assert.match(source, /pageForm\?\.mutate/)
})

test('client shows the default local DSH endpoints for an unset host list', () => {
  assert.match(source, /'127\.0\.0\.1:3080'/)
  assert.match(source, /'localhost:3080'/)
})

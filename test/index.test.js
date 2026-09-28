import assert from 'node:assert/strict'
import test from 'node:test'
import { apply, internals } from '../index.js'

function req({ method = 'GET', url = '/', headers = {} } = {}) {
  return { method, url, headers }
}

test('index transform injects host ownership and online markers once', () => {
  const first = internals.transform('<html><head></head><body></body></html>')
  assert.match(first, /__DSH_TRANSPORT__/)
  assert.match(first, /__DSH_ONLINE_FORCE__/)

  const second = internals.transform(first)
  assert.equal(second.match(/__DSH_TRANSPORT__/g).length, 1)
  assert.equal(second.match(/__DSH_ONLINE_FORCE__/g).length, 1)
})

test('auto auth is disabled by default', () => {
  const config = internals.withDefaults()
  assert.equal(internals.isAutoAuthRequest(req({ headers: { host: 'example.test' } }), config), false)
})

test('auto auth allows only configured external hosts', () => {
  const config = internals.withDefaults({
    autoAuthHosts: ['dsh.example.test', 'localhost:18080'],
  })

  assert.equal(internals.isAutoAuthRequest(req({
    headers: {
      host: '127.0.0.1:3080',
      'x-forwarded-host': 'dsh.example.test',
      'x-forwarded-proto': 'http',
    },
  }), config), true)

  assert.equal(internals.isAutoAuthRequest(req({
    headers: {
      host: '127.0.0.1:3080',
      'x-forwarded-host': 'other.example.test',
      'x-forwarded-proto': 'http',
    },
  }), config), false)

  assert.equal(internals.isAutoAuthRequest(req({
    headers: { host: 'localhost:18080' },
  }), config), true)
})

test('auto auth ignores token requests and non-root paths', () => {
  const config = internals.withDefaults({
    autoAuthHosts: ['dsh.example.test'],
  })

  assert.equal(internals.isAutoAuthRequest(req({
    url: '/?token=abc',
    headers: { host: 'dsh.example.test' },
  }), config), false)

  assert.equal(internals.isAutoAuthRequest(req({
    url: '/api',
    headers: { host: 'dsh.example.test' },
  }), config), false)
})

test('proxy secret must match when configured', () => {
  const config = internals.withDefaults({
    autoAuthHosts: ['dsh.example.test'],
    proxySecretHeader: 'X-DSH-Domain-Trust',
    proxySecretValue: 'secret',
  })

  assert.equal(internals.isAutoAuthRequest(req({
    headers: {
      host: 'dsh.example.test',
      'x-dsh-domain-trust': 'secret',
    },
  }), config), true)

  assert.equal(internals.isAutoAuthRequest(req({
    headers: {
      host: 'dsh.example.test',
      'x-dsh-domain-trust': 'wrong',
    },
  }), config), false)
})

test('apply redirects unauthenticated index requests through DSH authenticatedUrl', () => {
  const connection = {
    authorizeIndex(req, res) {
      res.writeHead(401)
      res.end()
      return false
    },
    authenticatedUrl(baseUrl) {
      return `${baseUrl}/?token=generated`
    },
  }
  const ctx = {
    webServer: {
      tapIndex() {
        return () => {}
      },
    },
    effect(dispose) {
      return dispose
    },
    inject(deps, callback) {
      if (deps.includes('connection')) callback({ connection, effect: this.effect })
    },
  }
  apply(ctx, {
    autoAuthHosts: ['dsh.example.test'],
  })

  let status
  let headers
  let ended = false
  const allowed = connection.authorizeIndex(req({
    headers: {
      host: '127.0.0.1:3080',
      'x-forwarded-host': 'dsh.example.test',
      'x-forwarded-proto': 'http',
    },
  }), {
    writeHead(nextStatus, nextHeaders) {
      status = nextStatus
      headers = nextHeaders
    },
    end() {
      ended = true
    },
  })

  assert.equal(allowed, false)
  assert.equal(status, 303)
  assert.equal(headers.location, 'http://dsh.example.test/?token=generated')
  assert.equal(ended, true)
})

test('apply reads namespace snapshot from settings.describe when settings is available', () => {
  const describeCalls = []
  const listeners = []
  const ctx = {
    webServer: {
      tapIndex() {
        return () => {}
      },
    },
    effect(fn) {
      const dispose = typeof fn === 'function' ? fn() : fn
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject(deps, callback) {
      if (deps.includes('settings')) {
        const settingsCtx = {
          settings: {
            describe(options) {
              describeCalls.push(options)
              return [
                { ns: 'other-plugin', value: {} },
                { ns: 'dsh-domain-trust', value: { autoAuthHosts: ['dsh.example.test'] } },
              ]
            },
          },
          effect(fn) {
            const dispose = typeof fn === 'function' ? fn() : fn
            return typeof dispose === 'function' ? dispose : () => {}
          },
          on(event, handler, options) {
            listeners.push({ event, handler, options })
            return () => {}
          },
        }
        callback(settingsCtx)
      }
    },
  }

  apply(ctx)

  assert.ok(describeCalls.length >= 1)
  assert.deepEqual(describeCalls[0], { redactSecrets: false })
  assert.equal(listeners.length, 1)
  assert.equal(listeners[0].event, 'settings/document-updated')
  assert.deepEqual(listeners[0].options, { global: true })
})

test('configured hosts enable auto auth from the current settings snapshot', () => {
  let settingsState = { autoAuthHosts: ['dsh.example.test'] }
  const connection = {
    authorizeIndex(req, res) {
      res.writeHead(401)
      res.end()
      return false
    },
    authenticatedUrl(baseUrl) {
      return `${baseUrl}/?token=generated`
    },
  }
  const ctx = {
    webServer: {
      tapIndex() {
        return () => {}
      },
    },
    effect(fn) {
      const dispose = typeof fn === 'function' ? fn() : fn
      return typeof dispose === 'function' ? dispose : () => {}
    },
    inject(deps, callback) {
      if (deps.includes('settings')) {
        const settingsCtx = {
          settings: {
            describe() {
              return [{ ns: 'dsh-domain-trust', value: settingsState }]
            },
          },
          effect(fn) {
            const dispose = typeof fn === 'function' ? fn() : fn
            return typeof dispose === 'function' ? dispose : () => {}
          },
          on() {
            return () => {}
          },
        }
        callback(settingsCtx)
      }
      if (deps.includes('connection')) callback({ connection, effect: this.effect })
    },
  }

  apply(ctx)

  let status
  connection.authorizeIndex(req({
    headers: { host: 'dsh.example.test' },
  }), {
    writeHead(nextStatus) {
      status = nextStatus
    },
    end() {},
  })

  assert.equal(status, 303)
})

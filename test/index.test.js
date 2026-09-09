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
    autoAuth: true,
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
    autoAuth: true,
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
    autoAuth: true,
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
    autoAuth: true,
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

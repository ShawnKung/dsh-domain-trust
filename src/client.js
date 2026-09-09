import React, { useEffect, useSyncExternalStore, useState } from 'react'

export const inject = ['slots', 'settingsScope']

const NS = 'dsh-domain-trust'
const DEFAULTS = Object.freeze({
  autoAuth: false,
  autoAuthHosts: [],
  proxySecretHeader: '',
  proxySecretValue: '',
  proxySecretEnv: '',
})

const STYLE = `
.dt-settings{list-style:none;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25));border-radius:12px;background:var(--dsw-alias-bg-layer-3,transparent);color:inherit;transition:border-color .16s,background .16s}.dt-settings:hover{border-color:var(--dsw-alias-label-dimmed,rgba(127,127,127,.45))}.dt-settings[data-open=true]{background:var(--dsw-alias-bg-layer-2,transparent);border-color:var(--dsw-alias-label-dimmed,rgba(127,127,127,.45))}
.dt-settings-header{appearance:none;box-sizing:border-box;width:100%;border:0;border-radius:12px;background:transparent;color:inherit;display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;font:inherit;cursor:pointer}.dt-settings-head{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.dt-settings-title{font-size:15px;font-weight:600;line-height:1.4}.dt-settings-description{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-secondary,#9ca3af)}.dt-chevron{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;transition:transform .16s}.dt-settings[data-open=true] .dt-chevron{transform:rotate(180deg)}.dt-settings-body{border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));margin:0 16px;padding:4px 0 8px}
.dt-form{display:grid;gap:14px}.dt-field{display:grid;gap:6px;padding-top:8px}.dt-label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:550}.dt-field input,.dt-field textarea{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.28));border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;padding:0 10px;font:inherit;font-size:12px}.dt-field input{height:34px}.dt-field textarea{min-height:92px;resize:vertical;padding:8px 10px;line-height:1.45}.dt-help{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#9ca3af)}
.dt-toggle{display:flex;align-items:center;gap:8px;padding-top:8px}.dt-toggle input{width:16px;height:16px;margin:0;flex:none}.dt-buttons{display:flex;justify-content:flex-end;gap:8px}.dt-button{height:34px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.25));border-radius:6px;padding:0 12px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}.dt-button-primary{background:var(--dsw-alias-button-info-fill,#2563eb);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dt-button:disabled{opacity:.5;cursor:default}.dt-message{font-size:11px}.dt-message[data-error=true]{color:var(--dsw-alias-state-error-primary,#ef4444)}
`

function installStyle() {
  if (document.querySelector('style[data-dsh-domain-trust-style]')) return
  const style = document.createElement('style')
  style.dataset.dshDomainTrustStyle = ''
  style.textContent = STYLE
  document.head.append(style)
}

function valuesFrom(snapshot) {
  return {
    ...DEFAULTS,
    ...(snapshot.status === 'ready' ? snapshot.value ?? {} : {}),
  }
}

function hostsText(hosts) {
  return Array.isArray(hosts) ? hosts.join('\n') : ''
}

function parseHosts(value) {
  return value
    .split(/\r?\n|,/)
    .map(item => item.trim())
    .filter(Boolean)
}

function createSettingsCard(scope) {
  return function DshDomainTrustSettings() {
    const snapshot = useSyncExternalStore(
      listener => scope.subscribe(listener),
      () => scope.getSnapshot(),
    )
    const values = valuesFrom(snapshot)
    const [open, setOpen] = useState(false)
    const [autoAuth, setAutoAuth] = useState(Boolean(values.autoAuth))
    const [autoAuthHosts, setAutoAuthHosts] = useState(hostsText(values.autoAuthHosts))
    const [proxySecretHeader, setProxySecretHeader] = useState(values.proxySecretHeader ?? '')
    const [proxySecretEnv, setProxySecretEnv] = useState(values.proxySecretEnv ?? '')
    const [proxySecretValue, setProxySecretValue] = useState(values.proxySecretValue ?? '')
    const [saving, setSaving] = useState(false)
    const [message, setMessage] = useState('')
    const [failed, setFailed] = useState(false)

    const resetDraft = () => {
      const next = valuesFrom(scope.getSnapshot())
      setAutoAuth(Boolean(next.autoAuth))
      setAutoAuthHosts(hostsText(next.autoAuthHosts))
      setProxySecretHeader(next.proxySecretHeader ?? '')
      setProxySecretEnv(next.proxySecretEnv ?? '')
      setProxySecretValue(next.proxySecretValue ?? '')
    }

    useEffect(() => {
      if (snapshot.status !== 'ready') return
      resetDraft()
    }, [snapshot.revision])

    const save = async () => {
      setSaving(true)
      setFailed(false)
      setMessage('')
      try {
        await scope.mutate([
          { op: 'set', path: ['autoAuth'], value: Boolean(autoAuth) },
          { op: 'set', path: ['autoAuthHosts'], value: parseHosts(autoAuthHosts) },
          { op: 'set', path: ['proxySecretHeader'], value: proxySecretHeader.trim() },
          { op: 'set', path: ['proxySecretEnv'], value: proxySecretEnv.trim() },
          { op: 'set', path: ['proxySecretValue'], value: proxySecretValue },
        ], snapshot.revision)
        setMessage('已保存')
      } catch (error) {
        setFailed(true)
        setMessage(error.message || '保存失败')
      } finally {
        setSaving(false)
      }
    }

    const field = (label, control, help) => React.createElement(
      'div',
      { className: 'dt-field' },
      React.createElement('label', { className: 'dt-label' }, label),
      control,
      help ? React.createElement('div', { className: 'dt-help' }, help) : null,
    )

    const form = React.createElement(
      'div',
      { className: 'dt-form' },
      React.createElement(
        'label',
        { className: 'dt-toggle' },
        React.createElement('input', {
          type: 'checkbox',
          checked: autoAuth,
          onChange: event => setAutoAuth(event.target.checked),
        }),
        React.createElement('span', null, '启用自动认证桥接'),
      ),
      field('信任 Host', React.createElement('textarea', {
        value: autoAuthHosts,
        placeholder: 'dsh.example.internal\nlocalhost:18080\n127.0.0.1:18080',
        spellCheck: false,
        onChange: event => setAutoAuthHosts(event.target.value),
      }), '每行一个 host 或 host:port。只影响自动认证桥接，不会绑定 0.0.0.0。'),
      field('代理 Secret Header', React.createElement('input', {
        type: 'text',
        value: proxySecretHeader,
        placeholder: 'X-DSH-Domain-Trust',
        spellCheck: false,
        onChange: event => setProxySecretHeader(event.target.value),
      }), '留空则不校验代理私有 header。'),
      field('Secret 环境变量', React.createElement('input', {
        type: 'text',
        value: proxySecretEnv,
        placeholder: 'DSH_DOMAIN_TRUST_SECRET',
        spellCheck: false,
        onChange: event => setProxySecretEnv(event.target.value),
      }), '配置后优先读取环境变量中的 secret。'),
      field('直接 Secret', React.createElement('input', {
        type: 'password',
        value: proxySecretValue,
        autoComplete: 'new-password',
        onChange: event => setProxySecretValue(event.target.value),
      }), '不推荐把真实 secret 写进 profile；优先使用环境变量。'),
      message ? React.createElement(
        'div',
        { className: 'dt-message', 'data-error': String(failed) },
        message,
      ) : null,
      React.createElement(
        'div',
        { className: 'dt-buttons' },
        React.createElement(
          'button',
          {
            className: 'dt-button',
            type: 'button',
            disabled: saving || snapshot.status !== 'ready',
            onClick: resetDraft,
          },
          '重置',
        ),
        React.createElement(
          'button',
          {
            className: 'dt-button dt-button-primary',
            type: 'button',
            disabled: saving || snapshot.status !== 'ready' || !snapshot.writable,
            onClick: () => void save(),
          },
          saving ? '保存中' : '保存',
        ),
      ),
    )

    return React.createElement(
      'li',
      {
        className: 'dt-settings',
        'data-open': String(open),
        'data-dsh-plugin': NS,
        'data-dsh-part': 'settings-card',
      },
      React.createElement(
        'button',
        {
          type: 'button',
          className: 'dt-settings-header',
          'aria-expanded': open,
          onClick: () => setOpen(value => !value),
        },
        React.createElement(
          'span',
          { className: 'dt-settings-head' },
          React.createElement('span', { className: 'dt-settings-title' }, 'Domain Trust'),
          React.createElement(
            'span',
            { className: 'dt-settings-description' },
            '配置可信 Host、自动认证桥接和代理 secret。',
          ),
        ),
        React.createElement(
          'svg',
          { className: 'dt-chevron', viewBox: '0 0 14 14', 'aria-hidden': true },
          React.createElement('path', { d: 'm3 5.25 4 4 4-4' }),
        ),
      ),
      open ? React.createElement('div', { className: 'dt-settings-body' }, form) : null,
    )
  }
}

export function apply(ctx) {
  installStyle()
  const scope = ctx.settingsScope.bind({ namespace: NS })
  const SettingsCard = createSettingsCard(scope)
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    key: NS,
    order: 1_000,
  }, SettingsCard))
}

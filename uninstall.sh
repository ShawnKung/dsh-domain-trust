#!/usr/bin/env bash
# dsh-domain-trust 卸载：从 web profile 移除依赖与 bundle 条目，刷新依赖，可选重启。
#
# 用法:
#   ./uninstall.sh                # 卸载并重启 ai.deepseek.dsh-web
#   ./uninstall.sh --no-restart   # 只卸载，不重启服务

set -euo pipefail

RESTART=1
[[ "${1:-}" == "--no-restart" ]] && RESTART=0

DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PROFILE_DIR="$DSH_HOME_DIR/profiles/web"
PKG_JSON="$PROFILE_DIR/package.json"
LABEL="ai.deepseek.dsh-web"

say() { printf '\033[36m[dsh-domain-trust]\033[0m %s\n' "$*"; }
die() { printf '\033[31m[dsh-domain-trust] 错误：%s\033[0m\n' "$*" >&2; exit 1; }

[[ -f "$PKG_JSON" ]] || die "找不到 profile 的 package.json: $PKG_JSON"

node - "$PKG_JSON" <<'NODE'
const fs = require('fs');
const [file] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = false;
if (pkg.dependencies?.['dsh-domain-trust'] !== undefined) {
  delete pkg.dependencies['dsh-domain-trust'];
  changed = true;
}
const bundles = pkg.dsh?.profile?.bundles;
if (Array.isArray(bundles)) {
  const i = bundles.indexOf('dsh-domain-trust');
  if (i !== -1) { bundles.splice(i, 1); changed = true; }
}
if (changed) {
  const bak = `${file}.bak.uninstall-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
  fs.copyFileSync(file, bak);
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`已更新 package.json（备份: ${bak}）。`);
} else {
  console.log('package.json 中没有 dsh-domain-trust 条目，无需变更。');
}
NODE

rm -rf "$PROFILE_DIR/node_modules/dsh-domain-trust"
(cd "$PROFILE_DIR" && pnpm install --force 2>&1 | tail -3)
say '依赖已刷新。'

if [[ "$RESTART" == 1 ]] && launchctl list | grep -q "$LABEL"; then
  launchctl kill TERM "gui/$(id -u)/$LABEL"
  say '已向服务发送优雅重启信号。'
fi

say '卸载完成。'

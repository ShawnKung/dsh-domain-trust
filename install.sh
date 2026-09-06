#!/usr/bin/env bash
# dsh-domain-trust 一键安装：链接到 ~/.dsh/plugins、写入 web profile、刷新依赖、重启服务。
#
# 用法:
#   ./install.sh                 # 安装并重启 ai.deepseek.dsh-web（默认）
#   ./install.sh --no-restart    # 只安装，不重启服务（下次重启生效）
#
# 幂等：重复执行不会重复写入；package.json 每次变更前会带时间戳备份。

set -euo pipefail

RESTART=1
[[ "${1:-}" == "--no-restart" ]] && RESTART=0

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DSH_HOME_DIR="${DSH_HOME:-$HOME/.dsh}"
PLUGINS_DIR="$DSH_HOME_DIR/plugins"
PROFILE_DIR="$DSH_HOME_DIR/profiles/web"
LINK_PATH="$PLUGINS_DIR/dsh-domain-trust"
PKG_JSON="$PROFILE_DIR/package.json"
LABEL="ai.deepseek.dsh-web"
DEP_ENTRY='"dsh-domain-trust": "file:../../plugins/dsh-domain-trust"'
BUNDLE_ENTRY='"dsh-domain-trust"'

say() { printf '\033[36m[dsh-domain-trust]\033[0m %s\n' "$*"; }
die() { printf '\033[31m[dsh-domain-trust] 错误：%s\033[0m\n' "$*" >&2; exit 1; }

# ---- 1. 把仓库链接进 ~/.dsh/plugins（profile 用 file:../../plugins/... 相对引用）----
mkdir -p "$PLUGINS_DIR"
if [[ -e "$LINK_PATH" && ! -L "$LINK_PATH" ]]; then
  die "$LINK_PATH 已存在且不是符号链接；请先手动处理（可能是旧版拷贝，移走后重跑即可）。"
fi
ln -sfn "$REPO_DIR" "$LINK_PATH"
say "已链接: $LINK_PATH -> $REPO_DIR"

[[ -f "$PKG_JSON" ]] || die "找不到 profile 的 package.json: $PKG_JSON"
[[ -d "$PROFILE_DIR/node_modules" ]] || die "profile 尚未安装依赖，请先在该目录执行一次 pnpm install。"

# ---- 2. 写入 package.json（依赖 + bundle 条目，幂等）----
node - "$PKG_JSON" "$DEP_ENTRY" "$BUNDLE_ENTRY" <<'NODE'
const fs = require('fs');
const [file, depEntry, bundleEntry] = process.argv.slice(2);
const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
let changed = false;
if (pkg.dependencies?.['dsh-domain-trust'] !== undefined) {
  console.log('依赖条目已存在，跳过。');
} else {
  pkg.dependencies = { ...(pkg.dependencies ?? {}) };
  pkg.dependencies['dsh-domain-trust'] = 'file:../../plugins/dsh-domain-trust';
  changed = true;
}
const bundles = pkg.dsh?.profile?.bundles;
if (!Array.isArray(bundles)) {
  console.error('package.json 里没有 dsh.profile.bundles 数组。');
  process.exit(1);
}
if (bundles.includes('dsh-domain-trust')) {
  console.log('bundle 条目已存在，跳过。');
} else {
  const at = bundles.indexOf('dsh-lan-bridge');
  bundles.splice(at === -1 ? bundles.length : at + 1, 0, 'dsh-domain-trust');
  changed = true;
}
if (changed) {
  const bak = `${file}.bak.install-${new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14)}`;
  fs.copyFileSync(file, bak);
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`已更新 package.json（备份: ${bak}）。`);
} else {
  console.log('package.json 无需变更。');
}
NODE

# ---- 3. 刷新 pnpm 拷贝（file: 依赖有缓存，改内容后必须强制重装）----
rm -rf "$PROFILE_DIR/node_modules/dsh-domain-trust"
(cd "$PROFILE_DIR" && pnpm install --force 2>&1 | tail -3)
say '依赖已刷新。'

# ---- 4. 校验 profile 能正常 compose ----
if command -v dsh >/dev/null 2>&1; then
  if dsh --profile web --dump-config 2>/dev/null | grep -q 'id: dsh-domain-trust'; then
    say 'profile compose 校验通过。'
  else
    die 'profile compose 校验失败，请运行 dsh --profile web --dump-config 查看错误。'
  fi
else
  say '未找到 dsh 命令，跳过 compose 校验。'
fi

# ---- 5. 重启 launchd 服务（默认开启）----
if [[ "$RESTART" == 1 ]]; then
  if launchctl list | grep -q "$LABEL"; then
    launchctl kill TERM "gui/$(id -u)/$LABEL"
    say '已向服务发送优雅重启信号（launchd KeepAlive 会自动拉起）。'
    for _ in $(seq 1 20); do
      sleep 1
      if lsof -iTCP:3080 -sTCP:LISTEN >/dev/null 2>&1; then
        NEW_TOKEN="$(tail -1 "$DSH_HOME_DIR/logs/web.stdout.log" | grep -oE 'token=[A-Za-z0-9_-]+' | cut -d= -f2 || true)"
        say "服务已恢复监听 3080。新访问 token: ${NEW_TOKEN:-见 web.stdout.log}"
        break
      fi
    done
  else
    say "未检测到 launchd 服务 $LABEL，请自行重启 dsh web。"
  fi
fi

say '安装完成。'

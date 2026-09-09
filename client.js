window.__ModuleLoader__.load({
  id: "dsh-domain-trust",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    var __create = Object.create;
    var __defProp = Object.defineProperty;
    var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
    var __getOwnPropNames = Object.getOwnPropertyNames;
    var __getProtoOf = Object.getPrototypeOf;
    var __hasOwnProp = Object.prototype.hasOwnProperty;
    var __export = (target, all) => {
      for (var name in all)
        __defProp(target, name, { get: all[name], enumerable: true });
    };
    var __copyProps = (to, from, except, desc) => {
      if (from && typeof from === "object" || typeof from === "function") {
        for (let key of __getOwnPropNames(from))
          if (!__hasOwnProp.call(to, key) && key !== except)
            __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
      }
      return to;
    };
    var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
      // If the importer is in node compatibility mode or this is not an ESM
      // file that has been converted to a CommonJS file using a Babel-
      // compatible transform (i.e. "__esModule" has not been set), then set
      // "default" to the CommonJS "module.exports" for node compatibility.
      isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
      mod
    ));
    var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
    
    // src/client.js
    var client_exports = {};
    __export(client_exports, {
      apply: () => apply,
      inject: () => inject
    });
    module.exports = __toCommonJS(client_exports);
    var import_react = __toESM(require("react"), 1);
    var inject = ["slots", "settingsScope"];
    var NS = "dsh-domain-trust";
    var DEFAULTS = Object.freeze({
      autoAuth: false,
      autoAuthHosts: [],
      proxySecretHeader: "",
      proxySecretValue: "",
      proxySecretEnv: ""
    });
    var STYLE = `
    .dt-settings{list-style:none;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.25));border-radius:12px;background:var(--dsw-alias-bg-layer-3,transparent);color:inherit;transition:border-color .16s,background .16s}.dt-settings:hover{border-color:var(--dsw-alias-label-dimmed,rgba(127,127,127,.45))}.dt-settings[data-open=true]{background:var(--dsw-alias-bg-layer-2,transparent);border-color:var(--dsw-alias-label-dimmed,rgba(127,127,127,.45))}
    .dt-settings-header{appearance:none;box-sizing:border-box;width:100%;border:0;border-radius:12px;background:transparent;color:inherit;display:flex;align-items:center;gap:12px;padding:14px 16px;text-align:left;font:inherit;cursor:pointer}.dt-settings-head{display:flex;flex:1;min-width:0;flex-direction:column;gap:4px}.dt-settings-title{font-size:15px;font-weight:600;line-height:1.4}.dt-settings-description{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-secondary,#9ca3af)}.dt-chevron{width:14px;height:14px;flex:none;fill:none;stroke:currentColor;stroke-width:1.5;transition:transform .16s}.dt-settings[data-open=true] .dt-chevron{transform:rotate(180deg)}.dt-settings-body{border-top:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.2));margin:0 16px;padding:4px 0 8px}
    .dt-form{display:grid;gap:14px}.dt-field{display:grid;gap:6px;padding-top:8px}.dt-label{display:flex;align-items:center;gap:7px;font-size:12px;font-weight:550}.dt-field input,.dt-field textarea{box-sizing:border-box;width:100%;min-width:0;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.28));border-radius:6px;background:var(--dsw-alias-bg-layer-1,#fff);color:inherit;padding:0 10px;font:inherit;font-size:12px}.dt-field input{height:34px}.dt-field textarea{min-height:92px;resize:vertical;padding:8px 10px;line-height:1.45}.dt-help{font-size:11px;line-height:1.5;color:var(--dsw-alias-label-tertiary,#9ca3af)}
    .dt-toggle{display:flex;align-items:center;gap:8px;padding-top:8px}.dt-toggle input{width:16px;height:16px;margin:0;flex:none}.dt-buttons{display:flex;justify-content:flex-end;gap:8px}.dt-button{height:34px;border:1px solid var(--dsw-alias-border-l3,rgba(127,127,127,.25));border-radius:6px;padding:0 12px;background:transparent;color:inherit;font:inherit;font-size:12px;cursor:pointer}.dt-button-primary{background:var(--dsw-alias-button-info-fill,#2563eb);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}.dt-button:disabled{opacity:.5;cursor:default}.dt-message{font-size:11px}.dt-message[data-error=true]{color:var(--dsw-alias-state-error-primary,#ef4444)}
    `;
    function installStyle() {
      if (document.querySelector("style[data-dsh-domain-trust-style]")) return;
      const style = document.createElement("style");
      style.dataset.dshDomainTrustStyle = "";
      style.textContent = STYLE;
      document.head.append(style);
    }
    function valuesFrom(snapshot) {
      return {
        ...DEFAULTS,
        ...snapshot.status === "ready" ? snapshot.value ?? {} : {}
      };
    }
    function hostsText(hosts) {
      return Array.isArray(hosts) ? hosts.join("\n") : "";
    }
    function parseHosts(value) {
      return value.split(/\r?\n|,/).map((item) => item.trim()).filter(Boolean);
    }
    function createSettingsCard(scope) {
      return function DshDomainTrustSettings() {
        const snapshot = (0, import_react.useSyncExternalStore)(
          (listener) => scope.subscribe(listener),
          () => scope.getSnapshot()
        );
        const values = valuesFrom(snapshot);
        const [open, setOpen] = (0, import_react.useState)(false);
        const [autoAuth, setAutoAuth] = (0, import_react.useState)(Boolean(values.autoAuth));
        const [autoAuthHosts, setAutoAuthHosts] = (0, import_react.useState)(hostsText(values.autoAuthHosts));
        const [proxySecretHeader, setProxySecretHeader] = (0, import_react.useState)(values.proxySecretHeader ?? "");
        const [proxySecretEnv, setProxySecretEnv] = (0, import_react.useState)(values.proxySecretEnv ?? "");
        const [proxySecretValue, setProxySecretValue] = (0, import_react.useState)(values.proxySecretValue ?? "");
        const [saving, setSaving] = (0, import_react.useState)(false);
        const [message, setMessage] = (0, import_react.useState)("");
        const [failed, setFailed] = (0, import_react.useState)(false);
        const resetDraft = () => {
          const next = valuesFrom(scope.getSnapshot());
          setAutoAuth(Boolean(next.autoAuth));
          setAutoAuthHosts(hostsText(next.autoAuthHosts));
          setProxySecretHeader(next.proxySecretHeader ?? "");
          setProxySecretEnv(next.proxySecretEnv ?? "");
          setProxySecretValue(next.proxySecretValue ?? "");
        };
        (0, import_react.useEffect)(() => {
          if (snapshot.status !== "ready") return;
          resetDraft();
        }, [snapshot.revision]);
        const save = async () => {
          setSaving(true);
          setFailed(false);
          setMessage("");
          try {
            await scope.mutate([
              { op: "set", path: ["autoAuth"], value: Boolean(autoAuth) },
              { op: "set", path: ["autoAuthHosts"], value: parseHosts(autoAuthHosts) },
              { op: "set", path: ["proxySecretHeader"], value: proxySecretHeader.trim() },
              { op: "set", path: ["proxySecretEnv"], value: proxySecretEnv.trim() },
              { op: "set", path: ["proxySecretValue"], value: proxySecretValue }
            ], snapshot.revision);
            setMessage("\u5DF2\u4FDD\u5B58");
          } catch (error) {
            setFailed(true);
            setMessage(error.message || "\u4FDD\u5B58\u5931\u8D25");
          } finally {
            setSaving(false);
          }
        };
        const field = (label, control, help) => import_react.default.createElement(
          "div",
          { className: "dt-field" },
          import_react.default.createElement("label", { className: "dt-label" }, label),
          control,
          help ? import_react.default.createElement("div", { className: "dt-help" }, help) : null
        );
        const form = import_react.default.createElement(
          "div",
          { className: "dt-form" },
          import_react.default.createElement(
            "label",
            { className: "dt-toggle" },
            import_react.default.createElement("input", {
              type: "checkbox",
              checked: autoAuth,
              onChange: (event) => setAutoAuth(event.target.checked)
            }),
            import_react.default.createElement("span", null, "\u542F\u7528\u81EA\u52A8\u8BA4\u8BC1\u6865\u63A5")
          ),
          field("\u4FE1\u4EFB Host", import_react.default.createElement("textarea", {
            value: autoAuthHosts,
            placeholder: "dsh.example.internal\nlocalhost:18080\n127.0.0.1:18080",
            spellCheck: false,
            onChange: (event) => setAutoAuthHosts(event.target.value)
          }), "\u6BCF\u884C\u4E00\u4E2A host \u6216 host:port\u3002\u53EA\u5F71\u54CD\u81EA\u52A8\u8BA4\u8BC1\u6865\u63A5\uFF0C\u4E0D\u4F1A\u7ED1\u5B9A 0.0.0.0\u3002"),
          field("\u4EE3\u7406 Secret Header", import_react.default.createElement("input", {
            type: "text",
            value: proxySecretHeader,
            placeholder: "X-DSH-Domain-Trust",
            spellCheck: false,
            onChange: (event) => setProxySecretHeader(event.target.value)
          }), "\u7559\u7A7A\u5219\u4E0D\u6821\u9A8C\u4EE3\u7406\u79C1\u6709 header\u3002"),
          field("Secret \u73AF\u5883\u53D8\u91CF", import_react.default.createElement("input", {
            type: "text",
            value: proxySecretEnv,
            placeholder: "DSH_DOMAIN_TRUST_SECRET",
            spellCheck: false,
            onChange: (event) => setProxySecretEnv(event.target.value)
          }), "\u914D\u7F6E\u540E\u4F18\u5148\u8BFB\u53D6\u73AF\u5883\u53D8\u91CF\u4E2D\u7684 secret\u3002"),
          field("\u76F4\u63A5 Secret", import_react.default.createElement("input", {
            type: "password",
            value: proxySecretValue,
            autoComplete: "new-password",
            onChange: (event) => setProxySecretValue(event.target.value)
          }), "\u4E0D\u63A8\u8350\u628A\u771F\u5B9E secret \u5199\u8FDB profile\uFF1B\u4F18\u5148\u4F7F\u7528\u73AF\u5883\u53D8\u91CF\u3002"),
          message ? import_react.default.createElement(
            "div",
            { className: "dt-message", "data-error": String(failed) },
            message
          ) : null,
          import_react.default.createElement(
            "div",
            { className: "dt-buttons" },
            import_react.default.createElement(
              "button",
              {
                className: "dt-button",
                type: "button",
                disabled: saving || snapshot.status !== "ready",
                onClick: resetDraft
              },
              "\u91CD\u7F6E"
            ),
            import_react.default.createElement(
              "button",
              {
                className: "dt-button dt-button-primary",
                type: "button",
                disabled: saving || snapshot.status !== "ready" || !snapshot.writable,
                onClick: () => void save()
              },
              saving ? "\u4FDD\u5B58\u4E2D" : "\u4FDD\u5B58"
            )
          )
        );
        return import_react.default.createElement(
          "li",
          {
            className: "dt-settings",
            "data-open": String(open),
            "data-dsh-plugin": NS,
            "data-dsh-part": "settings-card"
          },
          import_react.default.createElement(
            "button",
            {
              type: "button",
              className: "dt-settings-header",
              "aria-expanded": open,
              onClick: () => setOpen((value) => !value)
            },
            import_react.default.createElement(
              "span",
              { className: "dt-settings-head" },
              import_react.default.createElement("span", { className: "dt-settings-title" }, "Domain Trust"),
              import_react.default.createElement(
                "span",
                { className: "dt-settings-description" },
                "\u914D\u7F6E\u53EF\u4FE1 Host\u3001\u81EA\u52A8\u8BA4\u8BC1\u6865\u63A5\u548C\u4EE3\u7406 secret\u3002"
              )
            ),
            import_react.default.createElement(
              "svg",
              { className: "dt-chevron", viewBox: "0 0 14 14", "aria-hidden": true },
              import_react.default.createElement("path", { d: "m3 5.25 4 4 4-4" })
            )
          ),
          open ? import_react.default.createElement("div", { className: "dt-settings-body" }, form) : null
        );
      };
    }
    function apply(ctx) {
      installStyle();
      const scope = ctx.settingsScope.bind({ namespace: NS });
      const SettingsCard = createSettingsCard(scope);
      ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
        name: "settings.plugin.item",
        key: NS,
        order: 1e3
      }, SettingsCard));
    }
    
    return module.exports;
  }
});

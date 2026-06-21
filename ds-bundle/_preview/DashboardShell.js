var __dsPreview = (() => {
  var __create = Object.create;
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getProtoOf = Object.getPrototypeOf;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res, err) => function __init() {
    if (err) throw err[0];
    try {
      return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
    } catch (e) {
      throw err = [e], e;
    }
  };
  var __commonJS = (cb, mod) => function __require() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };
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
  var __reExport = (target, mod, secondTarget) => (__copyProps(target, mod, "default"), secondTarget && __copyProps(secondTarget, mod, "default"));
  var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
    // If the importer is in node compatibility mode or this is not an ESM
    // file that has been converted to a CommonJS file using a Babel-
    // compatible transform (i.e. "__esModule" has not been set), then set
    // "default" to the CommonJS "module.exports" for node compatibility.
    isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
    mod
  ));
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // <define:import.meta.env>
  var init_define_import_meta_env = __esm({
    "<define:import.meta.env>"() {
    }
  });

  // ds-raw:__ds_raw__
  var require_ds_raw = __commonJS({
    "ds-raw:__ds_raw__"(exports, module) {
      init_define_import_meta_env();
      module.exports = window.SignalBridge;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      var R = window.React;
      function jsx2(t, p, k) {
        return R.createElement(t, k === void 0 ? p : Object.assign({ key: k }, p));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsx2;
      module.exports.jsxDEV = jsx2;
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/DashboardShell.tsx
  var DashboardShell_exports = {};
  __export(DashboardShell_exports, {
    SupervisorDashboard: () => SupervisorDashboard,
    WorkerDashboard: () => WorkerDashboard
  });
  init_define_import_meta_env();

  // ds-shim:ds
  var ds_exports = {};
  __export(ds_exports, {
    default: () => ds_default
  });
  init_define_import_meta_env();
  __reExport(ds_exports, __toESM(require_ds_raw()));
  var g = window.SignalBridge;
  var ds_default = "default" in g ? g.default : g;

  // .design-sync/previews/DashboardShell.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var workerNavItems = [
    { href: "/worker/cockpit", label: "Cockpit", icon: "cockpit", description: "Overview and alerts" },
    { href: "/worker/radar", label: "Radar", icon: "radar", description: "Live signal monitoring" },
    { href: "/worker/handoffs", label: "Handoffs", icon: "handoffs", description: "SafeNight handoffs" },
    { href: "/worker/profiles", label: "Youth Profiles", icon: "profiles" }
  ];
  var supervisorNavItems = [
    { href: "/supervisor/overview", label: "Overview", icon: "overview" },
    { href: "/supervisor/load", label: "Workload", icon: "load", description: "Team capacity" },
    { href: "/supervisor/audit", label: "Audit", icon: "audit", description: "Compliance log" },
    { href: "/supervisor/reassign", label: "Reassign", icon: "reassign" }
  ];
  var WorkerDashboard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardShell,
    {
      eyebrow: "Worker Dashboard",
      title: "SignalBridge Cockpit",
      description: "Monitor and respond to youth reaching out through SafeNight. Review handoffs, track active cases, and coordinate with your team.",
      sidebarTitle: "After-hours handoffs",
      sidebarBody: "Start with the handoffs from last night's SafeNight session before checking new signals.",
      navItems: workerNavItems,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, background: "#f1f5f9", borderRadius: 16, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }, children: "Main content area" })
    }
  );
  var SupervisorDashboard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardShell,
    {
      eyebrow: "Supervisor View",
      title: "Team Overview",
      description: "Review team workload, monitor case distribution, and ensure all youth are receiving timely support.",
      sidebarTitle: "Weekly review",
      sidebarBody: "Three escalated cases need sign-off. Two workers are near capacity — consider redistribution.",
      navItems: supervisorNavItems,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, background: "#f1f5f9", borderRadius: 16, height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 14 }, children: "Main content area" })
    }
  );
  return __toCommonJS(DashboardShell_exports);
})();

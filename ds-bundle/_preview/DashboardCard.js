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

  // .design-sync/previews/DashboardCard.tsx
  var DashboardCard_exports = {};
  __export(DashboardCard_exports, {
    ActiveCasesCard: () => ActiveCasesCard,
    CardGrid: () => CardGrid,
    EscalatedCard: () => EscalatedCard,
    PendingHandoffsCard: () => PendingHandoffsCard,
    ResolvedCard: () => ResolvedCard
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

  // node_modules/lucide-react/dist/esm/lucide-react.js
  init_define_import_meta_env();

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_define_import_meta_env();
  var import_react2 = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_define_import_meta_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();

  // node_modules/lucide-react/dist/esm/Icon.js
  init_define_import_meta_env();
  var import_react = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_define_import_meta_env();
  var defaultAttributes = {
    xmlns: "http://www.w3.org/2000/svg",
    width: 24,
    height: 24,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round"
  };

  // node_modules/lucide-react/dist/esm/Icon.js
  var Icon = (0, import_react.forwardRef)(
    ({
      color = "currentColor",
      size = 24,
      strokeWidth = 2,
      absoluteStrokeWidth,
      className = "",
      children,
      iconNode,
      ...rest
    }, ref) => {
      return (0, import_react.createElement)(
        "svg",
        {
          ref,
          ...defaultAttributes,
          width: size,
          height: size,
          stroke: color,
          strokeWidth: absoluteStrokeWidth ? Number(strokeWidth) * 24 / Number(size) : strokeWidth,
          className: mergeClasses("lucide", className),
          ...rest
        },
        [
          ...iconNode.map(([tag, attrs]) => (0, import_react.createElement)(tag, attrs)),
          ...Array.isArray(children) ? children : [children]
        ]
      );
    }
  );

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  var createLucideIcon = (iconName, iconNode) => {
    const Component = (0, import_react2.forwardRef)(
      ({ className, ...props }, ref) => (0, import_react2.createElement)(Icon, {
        ref,
        iconNode,
        className: mergeClasses(`lucide-${toKebabCase(iconName)}`, className),
        ...props
      })
    );
    Component.displayName = `${iconName}`;
    return Component;
  };

  // node_modules/lucide-react/dist/esm/icons/circle-check-big.js
  init_define_import_meta_env();
  var CircleCheckBig = createLucideIcon("CircleCheckBig", [
    ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
    ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/clock.js
  init_define_import_meta_env();
  var Clock = createLucideIcon("Clock", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/triangle-alert.js
  init_define_import_meta_env();
  var TriangleAlert = createLucideIcon("TriangleAlert", [
    [
      "path",
      {
        d: "m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3",
        key: "wmoenq"
      }
    ],
    ["path", { d: "M12 9v4", key: "juzpu7" }],
    ["path", { d: "M12 17h.01", key: "p32p05" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/users.js
  init_define_import_meta_env();
  var Users = createLucideIcon("Users", [
    ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
    ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
    ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
    ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
  ]);

  // .design-sync/previews/DashboardCard.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var ActiveCasesCard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 280 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardCard,
    {
      label: "Active Cases",
      value: "12",
      detail: "3 require follow-up within 24 hours",
      icon: Users,
      tone: "pine"
    }
  ) });
  var EscalatedCard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 280 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardCard,
    {
      label: "Escalated",
      value: "2",
      detail: "High-risk youth — review immediately",
      icon: TriangleAlert,
      tone: "coral"
    }
  ) });
  var PendingHandoffsCard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 280 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardCard,
    {
      label: "Pending Handoffs",
      value: "5",
      detail: "From last night's SafeNight sessions",
      icon: Clock,
      tone: "amber"
    }
  ) });
  var ResolvedCard = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 280 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    ds_exports.DashboardCard,
    {
      label: "Resolved This Week",
      value: "34",
      detail: "Cases closed with positive outcomes",
      icon: CircleCheckBig,
      tone: "slate"
    }
  ) });
  var CardGrid = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { padding: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, maxWidth: 580 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DashboardCard, { label: "Active Cases", value: "12", detail: "3 require follow-up", icon: Users, tone: "pine" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DashboardCard, { label: "Escalated", value: "2", detail: "Review immediately", icon: TriangleAlert, tone: "coral" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DashboardCard, { label: "Pending Handoffs", value: "5", detail: "From last night", icon: Clock, tone: "amber" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.DashboardCard, { label: "Resolved", value: "34", detail: "This week", icon: CircleCheckBig, tone: "slate" })
  ] });
  return __toCommonJS(DashboardCard_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/circle-check-big.js:
lucide-react/dist/esm/icons/clock.js:
lucide-react/dist/esm/icons/triangle-alert.js:
lucide-react/dist/esm/icons/users.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/

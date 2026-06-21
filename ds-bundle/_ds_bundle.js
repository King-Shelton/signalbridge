/* @ds-bundle: {"namespace":"SignalBridge","components":[{"name":"AfterHoursBadge","sourcePath":"components/general/AfterHoursBadge/AfterHoursBadge.jsx"},{"name":"ChatBubble","sourcePath":"components/general/ChatBubble/ChatBubble.jsx"},{"name":"DashboardCard","sourcePath":"components/general/DashboardCard/DashboardCard.jsx"},{"name":"DashboardShell","sourcePath":"components/general/DashboardShell/DashboardShell.jsx"},{"name":"HandoffConsentCard","sourcePath":"components/general/HandoffConsentCard/HandoffConsentCard.jsx"},{"name":"MessageInput","sourcePath":"components/general/MessageInput/MessageInput.jsx"},{"name":"RoleGate","sourcePath":"components/general/RoleGate/RoleGate.jsx"},{"name":"StatePanel","sourcePath":"components/general/StatePanel/StatePanel.jsx"},{"name":"WorkerConversationPreview","sourcePath":"components/general/WorkerConversationPreview/WorkerConversationPreview.jsx"},{"name":"YouthDashboardShell","sourcePath":"components/general/YouthDashboardShell/YouthDashboardShell.jsx"}],"sourceHashes":{"components/general/AfterHoursBadge/AfterHoursBadge.jsx":"0f9799592e59","components/general/AfterHoursBadge/AfterHoursBadge.d.ts":"6694e0f22c48","components/general/AfterHoursBadge/AfterHoursBadge.prompt.md":"2337647af693","components/general/ChatBubble/ChatBubble.jsx":"537d8b4d0324","components/general/ChatBubble/ChatBubble.d.ts":"c1dbc0e890cf","components/general/ChatBubble/ChatBubble.prompt.md":"cd146f5ccc16","components/general/DashboardCard/DashboardCard.jsx":"202e147c4708","components/general/DashboardCard/DashboardCard.d.ts":"d167e23b8ba6","components/general/DashboardCard/DashboardCard.prompt.md":"7a44977569ee","components/general/DashboardShell/DashboardShell.jsx":"562784c27bdd","components/general/DashboardShell/DashboardShell.d.ts":"a0602a047f2a","components/general/DashboardShell/DashboardShell.prompt.md":"df8d42956c9c","components/general/HandoffConsentCard/HandoffConsentCard.jsx":"4e4da54bc2d1","components/general/HandoffConsentCard/HandoffConsentCard.d.ts":"0c80bae0c05f","components/general/HandoffConsentCard/HandoffConsentCard.prompt.md":"2bcdf20432d6","components/general/MessageInput/MessageInput.jsx":"cddd44cbcaf4","components/general/MessageInput/MessageInput.d.ts":"f97cf8ad1999","components/general/MessageInput/MessageInput.prompt.md":"05e098d85a36","components/general/RoleGate/RoleGate.jsx":"26bdabc07a84","components/general/RoleGate/RoleGate.d.ts":"87354f9e2aa5","components/general/RoleGate/RoleGate.prompt.md":"db8993f1a237","components/general/StatePanel/StatePanel.jsx":"60dd83a7cb8d","components/general/StatePanel/StatePanel.d.ts":"978bf91a581e","components/general/StatePanel/StatePanel.prompt.md":"2f97b257ff60","components/general/WorkerConversationPreview/WorkerConversationPreview.jsx":"45b371bae839","components/general/WorkerConversationPreview/WorkerConversationPreview.d.ts":"c787216c30c5","components/general/WorkerConversationPreview/WorkerConversationPreview.prompt.md":"d7ddb9882ae6","components/general/YouthDashboardShell/YouthDashboardShell.jsx":"630836b24c65","components/general/YouthDashboardShell/YouthDashboardShell.d.ts":"7b177c9d58cf","components/general/YouthDashboardShell/YouthDashboardShell.prompt.md":"ae127cd8318a"},"inlinedExternals":["lucide-react"],"builtBy":"cc-design-sync"} */
var process=typeof process!=="undefined"?process:{env:{NODE_ENV:"development"}};
var SignalBridge = (() => {
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

  // <define:process.env>
  var define_process_env_default;
  var init_define_process_env = __esm({
    "<define:process.env>"() {
      define_process_env_default = { NODE_ENV: "development" };
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      init_define_import_meta_env();
      init_define_process_env();
      var R = window.React;
      function jsx(t, p, k) {
        return R.createElement(t, k === void 0 ? p : Object.assign({ key: k }, p));
      }
      module.exports = R;
      module.exports.jsx = jsx;
      module.exports.jsxs = jsx;
      module.exports.jsxDEV = jsx;
      module.exports.Fragment = R.Fragment;
    }
  });

  // ds-bundle/.pkg-entry.mjs
  var pkg_entry_exports = {};
  __export(pkg_entry_exports, {
    AfterHoursBadge: () => AfterHoursBadge,
    ChatBubble: () => ChatBubble,
    DashboardCard: () => DashboardCard,
    DashboardShell: () => DashboardShell,
    HandoffConsentCard: () => HandoffConsentCard,
    MessageInput: () => MessageInput,
    RoleGate: () => RoleGate,
    StatePanel: () => StatePanel,
    WorkerConversationPreview: () => WorkerConversationPreview,
    YouthDashboardShell: () => YouthDashboardShell
  });
  init_define_import_meta_env();
  init_define_process_env();

  // apps/web/components/AfterHoursBadge.tsx
  init_define_import_meta_env();
  init_define_process_env();

  // node_modules/lucide-react/dist/esm/lucide-react.js
  init_define_import_meta_env();
  init_define_process_env();

  // node_modules/lucide-react/dist/esm/createLucideIcon.js
  init_define_import_meta_env();
  init_define_process_env();
  var import_react2 = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/shared/src/utils.js
  init_define_import_meta_env();
  init_define_process_env();
  var toKebabCase = (string) => string.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
  var mergeClasses = (...classes) => classes.filter((className, index, array) => {
    return Boolean(className) && className.trim() !== "" && array.indexOf(className) === index;
  }).join(" ").trim();

  // node_modules/lucide-react/dist/esm/Icon.js
  init_define_import_meta_env();
  init_define_process_env();
  var import_react = __toESM(require_react_shim());

  // node_modules/lucide-react/dist/esm/defaultAttributes.js
  init_define_import_meta_env();
  init_define_process_env();
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

  // node_modules/lucide-react/dist/esm/icons/activity.js
  init_define_import_meta_env();
  init_define_process_env();
  var Activity = createLucideIcon("Activity", [
    [
      "path",
      {
        d: "M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2",
        key: "169zse"
      }
    ]
  ]);

  // node_modules/lucide-react/dist/esm/icons/arrow-right.js
  init_define_import_meta_env();
  init_define_process_env();
  var ArrowRight = createLucideIcon("ArrowRight", [
    ["path", { d: "M5 12h14", key: "1ays0h" }],
    ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/chart-column.js
  init_define_import_meta_env();
  init_define_process_env();
  var ChartColumn = createLucideIcon("ChartColumn", [
    ["path", { d: "M3 3v16a2 2 0 0 0 2 2h16", key: "c24i48" }],
    ["path", { d: "M18 17V9", key: "2bz60n" }],
    ["path", { d: "M13 17V5", key: "1frdt8" }],
    ["path", { d: "M8 17v-3", key: "17ska0" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/circle-check.js
  init_define_import_meta_env();
  init_define_process_env();
  var CircleCheck = createLucideIcon("CircleCheck", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/clipboard-list.js
  init_define_import_meta_env();
  init_define_process_env();
  var ClipboardList = createLucideIcon("ClipboardList", [
    ["rect", { width: "8", height: "4", x: "8", y: "2", rx: "1", ry: "1", key: "tgr4d6" }],
    [
      "path",
      {
        d: "M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2",
        key: "116196"
      }
    ],
    ["path", { d: "M12 11h4", key: "1jrz19" }],
    ["path", { d: "M12 16h4", key: "n85exb" }],
    ["path", { d: "M8 11h.01", key: "1dfujw" }],
    ["path", { d: "M8 16h.01", key: "18s6g9" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/clock-3.js
  init_define_import_meta_env();
  init_define_process_env();
  var Clock3 = createLucideIcon("Clock3", [
    ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
    ["polyline", { points: "12 6 12 12 16.5 12", key: "1aq6pp" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/file-text.js
  init_define_import_meta_env();
  init_define_process_env();
  var FileText = createLucideIcon("FileText", [
    ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
    ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
    ["path", { d: "M10 9H8", key: "b1mrlr" }],
    ["path", { d: "M16 13H8", key: "t4e002" }],
    ["path", { d: "M16 17H8", key: "z1uh3a" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/folder-kanban.js
  init_define_import_meta_env();
  init_define_process_env();
  var FolderKanban = createLucideIcon("FolderKanban", [
    [
      "path",
      {
        d: "M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z",
        key: "1fr9dc"
      }
    ],
    ["path", { d: "M8 10v4", key: "tgpxqk" }],
    ["path", { d: "M12 10v2", key: "hh53o1" }],
    ["path", { d: "M16 10v6", key: "1d6xys" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/inbox.js
  init_define_import_meta_env();
  init_define_process_env();
  var Inbox = createLucideIcon("Inbox", [
    ["polyline", { points: "22 12 16 12 14 15 10 15 8 12 2 12", key: "o97t9d" }],
    [
      "path",
      {
        d: "M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z",
        key: "oot6mr"
      }
    ]
  ]);

  // node_modules/lucide-react/dist/esm/icons/layout-dashboard.js
  init_define_import_meta_env();
  init_define_process_env();
  var LayoutDashboard = createLucideIcon("LayoutDashboard", [
    ["rect", { width: "7", height: "9", x: "3", y: "3", rx: "1", key: "10lvy0" }],
    ["rect", { width: "7", height: "5", x: "14", y: "3", rx: "1", key: "16une8" }],
    ["rect", { width: "7", height: "9", x: "14", y: "12", rx: "1", key: "1hutg5" }],
    ["rect", { width: "7", height: "5", x: "3", y: "16", rx: "1", key: "ldoo1y" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/loader-circle.js
  init_define_import_meta_env();
  init_define_process_env();
  var LoaderCircle = createLucideIcon("LoaderCircle", [
    ["path", { d: "M21 12a9 9 0 1 1-6.219-8.56", key: "13zald" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/log-out.js
  init_define_import_meta_env();
  init_define_process_env();
  var LogOut = createLucideIcon("LogOut", [
    ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
    ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
    ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/message-circle.js
  init_define_import_meta_env();
  init_define_process_env();
  var MessageCircle = createLucideIcon("MessageCircle", [
    ["path", { d: "M7.9 20A9 9 0 1 0 4 16.1L2 22Z", key: "vv11sd" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/message-square-more.js
  init_define_import_meta_env();
  init_define_process_env();
  var MessageSquareMore = createLucideIcon("MessageSquareMore", [
    ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", key: "1lielz" }],
    ["path", { d: "M8 10h.01", key: "19clt8" }],
    ["path", { d: "M12 10h.01", key: "1nrarc" }],
    ["path", { d: "M16 10h.01", key: "1m94wz" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/moon.js
  init_define_import_meta_env();
  init_define_process_env();
  var Moon = createLucideIcon("Moon", [
    ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "a7tn18" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/move-right.js
  init_define_import_meta_env();
  init_define_process_env();
  var MoveRight = createLucideIcon("MoveRight", [
    ["path", { d: "M18 8L22 12L18 16", key: "1r0oui" }],
    ["path", { d: "M2 12H22", key: "1m8cig" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/radar.js
  init_define_import_meta_env();
  init_define_process_env();
  var Radar = createLucideIcon("Radar", [
    ["path", { d: "M19.07 4.93A10 10 0 0 0 6.99 3.34", key: "z3du51" }],
    ["path", { d: "M4 6h.01", key: "oypzma" }],
    ["path", { d: "M2.29 9.62A10 10 0 1 0 21.31 8.35", key: "qzzz0" }],
    ["path", { d: "M16.24 7.76A6 6 0 1 0 8.23 16.67", key: "1yjesh" }],
    ["path", { d: "M12 18h.01", key: "mhygvu" }],
    ["path", { d: "M17.99 11.66A6 6 0 0 1 15.77 16.67", key: "1u2y91" }],
    ["circle", { cx: "12", cy: "12", r: "2", key: "1c9p78" }],
    ["path", { d: "m13.41 10.59 5.66-5.66", key: "mhq4k0" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/send-horizontal.js
  init_define_import_meta_env();
  init_define_process_env();
  var SendHorizontal = createLucideIcon("SendHorizontal", [
    [
      "path",
      {
        d: "M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z",
        key: "117uat"
      }
    ],
    ["path", { d: "M6 12h16", key: "s4cdu5" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/shield-check.js
  init_define_import_meta_env();
  init_define_process_env();
  var ShieldCheck = createLucideIcon("ShieldCheck", [
    [
      "path",
      {
        d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
        key: "oel41y"
      }
    ],
    ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
  ]);

  // node_modules/lucide-react/dist/esm/icons/triangle-alert.js
  init_define_import_meta_env();
  init_define_process_env();
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

  // node_modules/lucide-react/dist/esm/icons/users-round.js
  init_define_import_meta_env();
  init_define_process_env();
  var UsersRound = createLucideIcon("UsersRound", [
    ["path", { d: "M18 21a8 8 0 0 0-16 0", key: "3ypg7q" }],
    ["circle", { cx: "10", cy: "8", r: "5", key: "o932ke" }],
    ["path", { d: "M22 20c0-3.37-2-6.5-4-8a5 5 0 0 0-.45-8.3", key: "10s06x" }]
  ]);

  // apps/web/components/AfterHoursBadge.tsx
  function AfterHoursBadge({ timeLabel = "11:42 PM" }) {
    return /* @__PURE__ */ React.createElement("div", { className: "inline-flex items-center gap-2 rounded-full border border-amber/30 bg-amber/10 px-3 py-1 text-xs font-semibold text-amber" }, /* @__PURE__ */ React.createElement(Moon, { "aria-hidden": "true", className: "h-3.5 w-3.5" }), /* @__PURE__ */ React.createElement("span", null, "After-hours support active"), /* @__PURE__ */ React.createElement("span", { className: "text-amber/70" }, timeLabel));
  }

  // apps/web/components/ChatBubble.tsx
  init_define_import_meta_env();
  init_define_process_env();

  // apps/web/components/cn.ts
  init_define_import_meta_env();
  init_define_process_env();
  function cn(...classes) {
    return classes.filter(Boolean).join(" ");
  }

  // apps/web/components/ChatBubble.tsx
  var senderStyles = {
    youth: "ml-auto bg-pine text-white",
    assistant: "mr-auto border border-slate-200 bg-white text-ink",
    system: "mx-auto border border-coral/20 bg-coral/10 text-coral"
  };
  function ChatBubble({ sender, author, children, timestamp }) {
    const isYouth = sender === "youth";
    return /* @__PURE__ */ React.createElement("article", { className: cn("flex max-w-[92%] flex-col gap-1 sm:max-w-[82%]", isYouth && "items-end") }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 px-1 text-xs font-medium text-slate-500" }, /* @__PURE__ */ React.createElement("span", null, author), timestamp ? /* @__PURE__ */ React.createElement("span", null, timestamp) : null), /* @__PURE__ */ React.createElement(
      "div",
      {
        className: cn(
          "rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
          senderStyles[sender],
          isYouth ? "rounded-br-md" : "rounded-bl-md"
        )
      },
      children
    ));
  }

  // apps/web/components/DashboardCard.tsx
  init_define_import_meta_env();
  init_define_process_env();
  var toneStyles = {
    pine: {
      badge: "bg-pine/10 text-pine",
      panel: "bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,0.98))]",
      icon: "text-pine"
    },
    amber: {
      badge: "bg-amber/10 text-amber",
      panel: "bg-[linear-gradient(180deg,_rgba(183,121,31,0.08),_rgba(255,255,255,0.98))]",
      icon: "text-amber"
    },
    coral: {
      badge: "bg-coral/10 text-coral",
      panel: "bg-[linear-gradient(180deg,_rgba(217,95,72,0.08),_rgba(255,255,255,0.98))]",
      icon: "text-coral"
    },
    slate: {
      badge: "bg-slate-100 text-slate-600",
      panel: "bg-[linear-gradient(180deg,_rgba(241,245,249,0.92),_rgba(255,255,255,0.98))]",
      icon: "text-slate-600"
    }
  };
  function DashboardCard({
    label,
    value,
    detail,
    icon: Icon2,
    tone = "pine",
    className
  }) {
    const styles = toneStyles[tone];
    return /* @__PURE__ */ React.createElement(
      "article",
      {
        className: cn(
          "rounded-[24px] border border-slate-200 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel",
          styles.panel,
          className
        )
      },
      /* @__PURE__ */ React.createElement("div", { className: "flex items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" }, label), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-2xl font-semibold tracking-tight text-ink" }, value)), /* @__PURE__ */ React.createElement("div", { className: cn("rounded-2xl p-3", styles.badge) }, /* @__PURE__ */ React.createElement(Icon2, { "aria-hidden": "true", className: cn("h-5 w-5", styles.icon) }))),
      detail ? /* @__PURE__ */ React.createElement("p", { className: "mt-4 text-sm leading-6 text-slate-600" }, detail) : null
    );
  }

  // apps/web/components/DashboardShell.tsx
  init_define_import_meta_env();
  init_define_process_env();

  // .ds-sync/stubs/next-link.mjs
  init_define_import_meta_env();
  init_define_process_env();
  var import_react3 = __toESM(require_react_shim(), 1);
  function Link({ href, children, className, ...props }) {
    return import_react3.default.createElement("a", { href, className, ...props }, children);
  }

  // .ds-sync/stubs/next-navigation.mjs
  init_define_import_meta_env();
  init_define_process_env();
  var usePathname = () => "/";
  var useRouter = () => ({ push: () => {
  }, replace: () => {
  }, back: () => {
  }, forward: () => {
  }, refresh: () => {
  }, prefetch: () => {
  } });

  // apps/web/components/DashboardShell.tsx
  var navIcons = {
    cockpit: LayoutDashboard,
    radar: Radar,
    handoffs: ClipboardList,
    profiles: UsersRound,
    cases: FolderKanban,
    overview: LayoutDashboard,
    load: ChartColumn,
    audit: ShieldCheck,
    reassign: MoveRight,
    signal: Activity
  };
  function DashboardShell({
    eyebrow,
    title,
    description,
    sidebarTitle,
    sidebarBody,
    navItems,
    children
  }) {
    const pathname = usePathname();
    return /* @__PURE__ */ React.createElement("main", { className: "min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(31,111,100,0.14),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(217,95,72,0.1),_transparent_28%),linear-gradient(180deg,_#f6fbf9_0%,_#ffffff_56%,_#f5f8fb_100%)] px-4 py-4 sm:px-6 lg:px-8" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto flex w-full max-w-7xl flex-col gap-5" }, /* @__PURE__ */ React.createElement("header", { className: "overflow-hidden rounded-[32px] border border-slate-200 bg-white/90 shadow-panel backdrop-blur" }, /* @__PURE__ */ React.createElement("div", { className: "border-b border-slate-200/80 px-5 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.24em] text-pine" }, eyebrow), /* @__PURE__ */ React.createElement("div", { className: "mt-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between" }, /* @__PURE__ */ React.createElement("div", { className: "max-w-3xl" }, /* @__PURE__ */ React.createElement("h1", { className: "text-3xl font-semibold tracking-tight text-ink sm:text-4xl" }, title), /* @__PURE__ */ React.createElement("p", { className: "mt-3 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base" }, description)), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-pine/15 bg-pine/5 px-4 py-3 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-pine" }, "Workspace focus"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 font-medium text-ink" }, sidebarTitle)))), /* @__PURE__ */ React.createElement("div", { className: "grid gap-5 p-4 lg:grid-cols-[280px_1fr] lg:p-5" }, /* @__PURE__ */ React.createElement("aside", { className: "rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(31,111,100,0.08),_rgba(255,255,255,1))] p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.16em] text-slate-500" }, "Navigation"), /* @__PURE__ */ React.createElement("h2", { className: "mt-2 text-lg font-semibold text-ink" }, sidebarTitle), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm leading-6 text-slate-600" }, sidebarBody)), /* @__PURE__ */ React.createElement("nav", { className: "mt-5 grid gap-2" }, navItems.map((item) => {
      const Icon2 = navIcons[item.icon];
      const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
      return /* @__PURE__ */ React.createElement(
        Link,
        {
          key: item.href,
          href: item.href,
          className: cn(
            "group rounded-2xl border px-3 py-3 transition",
            isActive ? "border-pine bg-pine text-white shadow-sm" : "border-slate-200 bg-white/90 text-slate-700 hover:border-pine/30 hover:bg-mist hover:text-ink"
          )
        },
        /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-3" }, /* @__PURE__ */ React.createElement(
          "span",
          {
            className: cn(
              "grid h-10 w-10 place-items-center rounded-2xl transition",
              isActive ? "bg-white/10" : "bg-slate-100 text-pine group-hover:bg-white"
            )
          },
          /* @__PURE__ */ React.createElement(Icon2, { "aria-hidden": "true", className: "h-4 w-4" })
        ), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold" }, item.label), item.description ? /* @__PURE__ */ React.createElement(
          "p",
          {
            className: cn(
              "mt-0.5 text-xs leading-5",
              isActive ? "text-white/80" : "text-slate-500"
            )
          },
          item.description
        ) : null))
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "mt-5 rounded-2xl border border-slate-200 bg-white p-4" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" }, "SignalBridge note"), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm leading-6 text-slate-600" }, "Keep this workspace tied to the Mira after-hours handoff journey: priority signals, worker follow-up, and clear continuity for the next shift."))), /* @__PURE__ */ React.createElement("section", { className: "min-w-0" }, children)))));
  }

  // apps/web/components/HandoffConsentCard.tsx
  init_define_import_meta_env();
  init_define_process_env();
  function HandoffConsentCard({
    compact = false,
    consentGiven = false,
    disabled = false,
    onConsentChange
  }) {
    return /* @__PURE__ */ React.createElement("section", { className: "rounded-lg border border-pine/20 bg-white p-4 shadow-sm" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-start gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "rounded-full bg-pine/10 p-2 text-pine" }, /* @__PURE__ */ React.createElement(ShieldCheck, { "aria-hidden": "true", className: "h-5 w-5" })), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("h2", { className: "text-sm font-semibold text-ink" }, "Let your worker read a short note?"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm leading-6 text-slate-600" }, "You choose what gets shared. The note is only to help your worker understand what happened without asking you to explain it all again."))), /* @__PURE__ */ React.createElement("label", { className: "mt-4 flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-slate-200 bg-mist/40 px-3 py-2" }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { className: "block text-sm font-semibold text-ink" }, "I allow my worker to review this note"), /* @__PURE__ */ React.createElement("span", { className: "block text-xs leading-5 text-slate-500" }, "You can still choose what to talk about tomorrow.")), /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "checkbox",
        checked: consentGiven,
        disabled,
        onChange: (event) => onConsentChange?.(event.target.checked),
        className: "h-5 w-5 rounded border-slate-300 text-pine focus:ring-pine"
      }
    )), consentGiven ? /* @__PURE__ */ React.createElement("p", { className: "mt-3 rounded-lg border border-pine/20 bg-pine/10 px-3 py-2 text-sm font-medium text-pine" }, "Consent saved. Your worker can review the note, and you do not have to repeat everything unless you want to.") : /* @__PURE__ */ React.createElement("p", { className: "mt-3 rounded-lg border border-amber/30 bg-amber/10 px-3 py-2 text-sm font-medium text-amber" }, "Not shared yet. Your worker cannot review this note until you allow it."), /* @__PURE__ */ React.createElement("div", { className: "mt-4 grid gap-2 text-sm text-slate-600" }, /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(CircleCheck, { "aria-hidden": "true", className: "mt-0.5 h-4 w-4 text-pine" }), "What happened and what feels hard right now"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(CircleCheck, { "aria-hidden": "true", className: "mt-0.5 h-4 w-4 text-pine" }), "What SafeNight already replied"), /* @__PURE__ */ React.createElement("div", { className: "flex gap-2" }, /* @__PURE__ */ React.createElement(FileText, { "aria-hidden": "true", className: "mt-0.5 h-4 w-4 text-pine" }), "A gentle first message your worker can start with")), !compact ? /* @__PURE__ */ React.createElement("div", { className: "mt-4 flex flex-wrap gap-2" }, /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled: disabled || consentGiven,
        onClick: () => onConsentChange?.(true),
        className: "rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
      },
      consentGiven ? "Worker review allowed" : "Allow worker review"
    ), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        disabled,
        onClick: () => onConsentChange?.(false),
        className: "rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50"
      },
      "Not now"
    )) : null);
  }

  // apps/web/components/MessageInput.tsx
  init_define_import_meta_env();
  init_define_process_env();
  var import_react4 = __toESM(require_react_shim());
  function MessageInput({ defaultValue = "", disabled = false, onSend }) {
    const [message, setMessage] = (0, import_react4.useState)(defaultValue);
    function handleSubmit(event) {
      event.preventDefault();
      const trimmedMessage = message.trim();
      if (!trimmedMessage || disabled) {
        return;
      }
      onSend?.(trimmedMessage);
      setMessage("");
    }
    return /* @__PURE__ */ React.createElement(
      "form",
      {
        className: "flex items-end gap-3 border-t border-slate-200 bg-white p-3 sm:p-4",
        onSubmit: handleSubmit
      },
      /* @__PURE__ */ React.createElement("label", { className: "sr-only", htmlFor: "message" }, "Message SafeNight"),
      /* @__PURE__ */ React.createElement(
        "textarea",
        {
          id: "message",
          name: "message",
          rows: 2,
          value: message,
          onChange: (event) => setMessage(event.target.value),
          onKeyDown: (event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          },
          disabled,
          placeholder: "Write what you want SafeNight to know...",
          className: "min-h-12 flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm leading-6 text-ink outline-none transition placeholder:text-slate-400 focus:border-pine focus:ring-2 focus:ring-pine/15 disabled:cursor-not-allowed disabled:bg-slate-50"
        }
      ),
      /* @__PURE__ */ React.createElement(
        "button",
        {
          type: "submit",
          disabled: disabled || !message.trim(),
          "aria-label": "Send message",
          className: "grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-pine text-white transition hover:bg-pine/90 disabled:cursor-not-allowed disabled:bg-slate-300"
        },
        /* @__PURE__ */ React.createElement(SendHorizontal, { "aria-hidden": "true", className: "h-5 w-5" })
      )
    );
  }

  // apps/web/components/RoleGate.tsx
  init_define_import_meta_env();
  init_define_process_env();
  var import_react5 = __toESM(require_react_shim());

  // apps/web/lib/api-client.ts
  init_define_import_meta_env();
  init_define_process_env();
  var API_BASE_URL = define_process_env_default.NEXT_PUBLIC_SIGNALBRIDGE_API_URL ?? "http://localhost:8000";
  async function parseApiResponse(response) {
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      const message = body && typeof body === "object" && "detail" in body && body.detail ? body.detail : "SignalBridge API request failed.";
      throw new Error(message);
    }
    return body;
  }
  async function fetchCurrentUser(accessToken) {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return parseApiResponse(response);
  }

  // apps/web/lib/auth-session.ts
  init_define_import_meta_env();
  init_define_process_env();

  // apps/web/lib/constants.ts
  init_define_import_meta_env();
  init_define_process_env();

  // apps/web/lib/auth-session.ts
  var AUTH_SESSION_KEY = "signalbridge.authSession";
  function readAuthSession() {
    if (typeof window === "undefined") {
      return null;
    }
    const rawSession = window.localStorage.getItem(AUTH_SESSION_KEY);
    if (!rawSession) {
      return null;
    }
    try {
      const parsed = JSON.parse(rawSession);
      if (!parsed.accessToken || !parsed.user?.email || !parsed.user?.role) {
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }
  function saveAuthSession(session) {
    window.localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  }
  function clearAuthSession() {
    window.localStorage.removeItem(AUTH_SESSION_KEY);
  }

  // apps/web/components/StatePanel.tsx
  init_define_import_meta_env();
  init_define_process_env();
  var icons = {
    loading: LoaderCircle,
    empty: Inbox,
    error: TriangleAlert
  };
  function StatePanel({
    title,
    description,
    actionHref,
    actionLabel,
    compact = false,
    variant = "empty"
  }) {
    const Icon2 = icons[variant];
    return /* @__PURE__ */ React.createElement(
      "section",
      {
        className: compact ? "grid place-items-center rounded-lg border border-slate-200 bg-white p-4 text-center shadow-sm" : "grid min-h-[320px] place-items-center rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm"
      },
      /* @__PURE__ */ React.createElement("div", { className: "max-w-sm" }, /* @__PURE__ */ React.createElement("div", { className: "mx-auto grid h-11 w-11 place-items-center rounded-full bg-mist text-pine" }, /* @__PURE__ */ React.createElement(
        Icon2,
        {
          "aria-hidden": "true",
          className: variant === "loading" ? "h-5 w-5 animate-spin" : "h-5 w-5"
        }
      )), /* @__PURE__ */ React.createElement("h2", { className: "mt-4 text-lg font-semibold text-ink" }, title), /* @__PURE__ */ React.createElement("p", { className: "mt-2 text-sm leading-6 text-slate-600" }, description), actionHref && actionLabel ? /* @__PURE__ */ React.createElement(
        Link,
        {
          href: actionHref,
          className: "mt-5 inline-flex rounded-lg bg-pine px-4 py-2 text-sm font-semibold text-white transition hover:bg-pine/90"
        },
        actionLabel
      ) : null)
    );
  }

  // apps/web/components/RoleGate.tsx
  function RoleGate({ allowedRoles, children }) {
    const router = useRouter();
    const [session, setSession] = (0, import_react5.useState)(null);
    const [status, setStatus] = (0, import_react5.useState)(
      "loading"
    );
    (0, import_react5.useEffect)(() => {
      const storedSession = readAuthSession();
      if (!storedSession) {
        setStatus("missing");
        return;
      }
      fetchCurrentUser(storedSession.accessToken).then((user) => {
        const verifiedSession = { ...storedSession, user };
        saveAuthSession(verifiedSession);
        setSession(verifiedSession);
        setStatus(allowedRoles.includes(user.role) ? "ready" : "wrong-role");
      }).catch(() => {
        clearAuthSession();
        setStatus("missing");
      });
    }, [allowedRoles]);
    if (status === "loading") {
      return /* @__PURE__ */ React.createElement("main", { className: "mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement(
        StatePanel,
        {
          title: "Checking SignalBridge session",
          description: "The app is confirming your role with the backend.",
          variant: "loading"
        }
      ));
    }
    if (status === "missing") {
      return /* @__PURE__ */ React.createElement("main", { className: "mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement(
        StatePanel,
        {
          title: "Login needed",
          description: "Please sign in before opening this SignalBridge workspace.",
          actionHref: "/login",
          actionLabel: "Go to login",
          variant: "error"
        }
      ));
    }
    if (status === "wrong-role") {
      return /* @__PURE__ */ React.createElement("main", { className: "mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement(
        StatePanel,
        {
          title: "Different role required",
          description: `${session?.user.name ?? "This account"} cannot open this workspace.`,
          actionHref: "/login",
          actionLabel: "Switch account",
          variant: "error"
        }
      ));
    }
    return /* @__PURE__ */ React.createElement(React.Fragment, null, children);
  }

  // apps/web/components/WorkerConversationPreview.tsx
  init_define_import_meta_env();
  init_define_process_env();
  var riskStyles = {
    high: {
      label: "High",
      className: "bg-coral/10 text-coral ring-1 ring-coral/20"
    },
    medium: {
      label: "Medium",
      className: "bg-amber/10 text-amber ring-1 ring-amber/20"
    },
    low: {
      label: "Low",
      className: "bg-pine/10 text-pine ring-1 ring-pine/20"
    }
  };
  var channelStyles = {
    WhatsApp: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    Instagram: "bg-fuchsia-50 text-fuchsia-700 ring-1 ring-fuchsia-200",
    GatherTown: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    Discord: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
    "Web Chat": "bg-slate-100 text-slate-700 ring-1 ring-slate-200"
  };
  var sourceStyles = {
    "mock-seed": "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
    "api-ready": "bg-pine/10 text-pine ring-1 ring-pine/20"
  };
  var sourceLabels = {
    "mock-seed": "Mock seed feed",
    "api-ready": "API-ready feed"
  };
  function WorkerConversationPreview({
    youth
  }) {
    const risk = riskStyles[youth.riskLevel];
    return /* @__PURE__ */ React.createElement("article", { className: "overflow-hidden rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,_rgba(255,255,255,0.99),_rgba(246,249,251,0.97))] shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg" }, /* @__PURE__ */ React.createElement("div", { className: "border-b border-slate-200 px-5 py-4 sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-start justify-between gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "space-y-2" }, /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, /* @__PURE__ */ React.createElement("h3", { className: "text-lg font-semibold text-ink" }, youth.youthName), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${channelStyles[youth.channel]}`
      },
      youth.channel
    ), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${sourceStyles[youth.conversationSource]}`
      },
      sourceLabels[youth.conversationSource]
    )), /* @__PURE__ */ React.createElement("p", { className: "flex items-center gap-1 text-sm text-slate-500" }, /* @__PURE__ */ React.createElement(Clock3, { "aria-hidden": "true", className: "h-3.5 w-3.5" }), "Last active: ", youth.lastActive)), /* @__PURE__ */ React.createElement(
      "span",
      {
        className: `inline-flex rounded-full px-3 py-1 text-xs font-semibold ${risk.className}`
      },
      risk.label
    ))), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 px-5 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement("div", { className: "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" }, /* @__PURE__ */ React.createElement(MessageSquareMore, { "aria-hidden": "true", className: "h-3.5 w-3.5" }), "Conversation preview"), /* @__PURE__ */ React.createElement("div", { className: "space-y-3 rounded-2xl bg-slate-50 p-3" }, youth.conversationPreview.map((turn) => {
      const isYouth = turn.sender === "youth";
      const isSystem = turn.sender === "system";
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: `${youth.id}-${turn.timestamp}-${turn.sender}`,
          className: `flex ${isSystem ? "justify-center" : isYouth ? "justify-end" : "justify-start"}`
        },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: [
              "max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 shadow-sm",
              isSystem ? "border border-coral/20 bg-coral/10 text-coral" : isYouth ? "rounded-br-md bg-pine text-white" : "rounded-bl-md border border-slate-200 bg-white text-ink"
            ].join(" ")
          },
          /* @__PURE__ */ React.createElement(
            "div",
            {
              className: `flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${isYouth ? "text-white/70" : isSystem ? "text-coral/70" : "text-slate-500"}`
            },
            /* @__PURE__ */ React.createElement("span", null, turn.author),
            /* @__PURE__ */ React.createElement("span", null, turn.timestamp)
          ),
          /* @__PURE__ */ React.createElement("p", { className: `mt-1 ${isYouth ? "text-white" : isSystem ? "text-coral" : "text-slate-700"}` }, turn.message)
        )
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "grid gap-3 sm:grid-cols-[1.2fr_0.8fr] sm:items-end" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" }, "Suggested next step"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm leading-6 text-slate-700" }, youth.suggestedAction)), /* @__PURE__ */ React.createElement("div", { className: "rounded-2xl border border-slate-200 bg-white px-4 py-3" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs font-semibold uppercase tracking-[0.14em] text-slate-500" }, "Current status"), /* @__PURE__ */ React.createElement("p", { className: "mt-1 text-sm font-semibold text-ink" }, youth.status))), /* @__PURE__ */ React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-3 pt-1" }, /* @__PURE__ */ React.createElement("p", { className: "text-xs leading-5 text-slate-500" }, "Seeded now, API-ready later. Day 5 can swap this feed for live conversation data without changing the cockpit card contract."), /* @__PURE__ */ React.createElement(
      Link,
      {
        href: `/worker/youths/${youth.id}`,
        className: "inline-flex items-center gap-1 text-sm font-semibold text-pine hover:text-ink"
      },
      "Open youth case",
      /* @__PURE__ */ React.createElement(ArrowRight, { "aria-hidden": "true", className: "h-3.5 w-3.5" })
    ))));
  }

  // apps/web/components/YouthDashboardShell.tsx
  init_define_import_meta_env();
  init_define_process_env();

  // apps/web/lib/youth-session.ts
  init_define_import_meta_env();
  init_define_process_env();
  function readYouthSession() {
    const session = readAuthSession();
    if (!session || session.user.role !== "youth") {
      return null;
    }
    return {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      role: "youth",
      accessToken: session.accessToken
    };
  }
  function clearYouthSession() {
    clearAuthSession();
  }

  // apps/web/components/YouthDashboardShell.tsx
  var import_react6 = __toESM(require_react_shim());
  var youthNav = [
    { href: "/youth/chat", label: "Chat", icon: MessageCircle },
    { href: "/youth/handoff-preview", label: "Handoff Preview", icon: FileText },
    { href: "/youth/past-notes", label: "Past Notes", icon: ClipboardList }
  ];
  function YouthDashboardShell({ children }) {
    const pathname = usePathname();
    const router = useRouter();
    const [session, setSession] = (0, import_react6.useState)(null);
    const [isLoading, setIsLoading] = (0, import_react6.useState)(true);
    (0, import_react6.useEffect)(() => {
      setSession(readYouthSession());
      setIsLoading(false);
    }, []);
    function handleSignOut() {
      clearYouthSession();
      router.push("/login");
    }
    if (isLoading) {
      return /* @__PURE__ */ React.createElement("main", { className: "mx-auto min-h-screen w-full max-w-6xl px-4 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement(
        StatePanel,
        {
          title: "Loading youth dashboard",
          description: "SignalBridge is checking the current youth session.",
          variant: "loading"
        }
      ));
    }
    if (!session) {
      return /* @__PURE__ */ React.createElement("main", { className: "mx-auto min-h-screen w-full max-w-4xl px-4 py-5 sm:px-6" }, /* @__PURE__ */ React.createElement(
        StatePanel,
        {
          title: "Youth login needed",
          description: "Please continue as Mira before opening SafeNight Companion.",
          actionHref: "/login",
          actionLabel: "Go to login",
          variant: "error"
        }
      ));
    }
    return /* @__PURE__ */ React.createElement("main", { className: "mx-auto flex min-h-screen w-full max-w-7xl flex-col px-3 py-4 sm:px-6 sm:py-5" }, /* @__PURE__ */ React.createElement("header", { className: "flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4" }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold uppercase tracking-[0.16em] text-pine" }, "SignalBridge Youth"), /* @__PURE__ */ React.createElement("h1", { className: "mt-1 text-2xl font-semibold text-ink" }, "SafeNight Companion")), /* @__PURE__ */ React.createElement("div", { className: "flex min-w-0 items-center gap-2 sm:gap-3" }, /* @__PURE__ */ React.createElement("div", { className: "min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-right shadow-sm" }, /* @__PURE__ */ React.createElement("p", { className: "text-sm font-semibold text-ink" }, session.name), /* @__PURE__ */ React.createElement("p", { className: "truncate text-xs text-slate-500" }, session.email)), /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        onClick: handleSignOut,
        "aria-label": "Sign out",
        className: "grid h-10 w-10 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-pine hover:text-pine"
      },
      /* @__PURE__ */ React.createElement(LogOut, { "aria-hidden": "true", className: "h-4 w-4" })
    ))), /* @__PURE__ */ React.createElement("div", { className: "grid flex-1 gap-4 py-4 lg:grid-cols-[220px_1fr] lg:gap-5 lg:py-5" }, /* @__PURE__ */ React.createElement("nav", { className: "flex h-fit gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm lg:grid lg:overflow-visible" }, youthNav.map((item) => {
      const Icon2 = item.icon;
      const isActive = pathname === item.href;
      return /* @__PURE__ */ React.createElement(
        Link,
        {
          key: item.href,
          href: item.href,
          className: cn(
            "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold transition lg:gap-3",
            isActive ? "bg-pine text-white" : "text-slate-600 hover:bg-mist hover:text-ink"
          )
        },
        /* @__PURE__ */ React.createElement(Icon2, { "aria-hidden": "true", className: "h-4 w-4" }),
        item.label
      );
    })), /* @__PURE__ */ React.createElement("div", { className: "min-w-0" }, children)));
  }
  return __toCommonJS(pkg_entry_exports);
})();
/*! Bundled license information:

lucide-react/dist/esm/shared/src/utils.js:
lucide-react/dist/esm/defaultAttributes.js:
lucide-react/dist/esm/Icon.js:
lucide-react/dist/esm/createLucideIcon.js:
lucide-react/dist/esm/icons/activity.js:
lucide-react/dist/esm/icons/arrow-right.js:
lucide-react/dist/esm/icons/chart-column.js:
lucide-react/dist/esm/icons/circle-check.js:
lucide-react/dist/esm/icons/clipboard-list.js:
lucide-react/dist/esm/icons/clock-3.js:
lucide-react/dist/esm/icons/file-text.js:
lucide-react/dist/esm/icons/folder-kanban.js:
lucide-react/dist/esm/icons/inbox.js:
lucide-react/dist/esm/icons/layout-dashboard.js:
lucide-react/dist/esm/icons/loader-circle.js:
lucide-react/dist/esm/icons/log-out.js:
lucide-react/dist/esm/icons/message-circle.js:
lucide-react/dist/esm/icons/message-square-more.js:
lucide-react/dist/esm/icons/moon.js:
lucide-react/dist/esm/icons/move-right.js:
lucide-react/dist/esm/icons/radar.js:
lucide-react/dist/esm/icons/send-horizontal.js:
lucide-react/dist/esm/icons/shield-check.js:
lucide-react/dist/esm/icons/triangle-alert.js:
lucide-react/dist/esm/icons/users-round.js:
lucide-react/dist/esm/lucide-react.js:
  (**
   * @license lucide-react v0.468.0 - ISC
   *
   * This source code is licensed under the ISC license.
   * See the LICENSE file in the root directory of this source tree.
   *)
*/
window.SignalBridge=SignalBridge.__dsMainNs?Object.assign({},SignalBridge,SignalBridge.__dsMainNs,{__dsMainNs:undefined}):SignalBridge;

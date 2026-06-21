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

  // .design-sync/previews/WorkerConversationPreview.tsx
  var WorkerConversationPreview_exports = {};
  __export(WorkerConversationPreview_exports, {
    HighRiskCase: () => HighRiskCase,
    MediumRiskCase: () => MediumRiskCase
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

  // .design-sync/previews/WorkerConversationPreview.tsx
  var import_jsx_runtime = __toESM(require_react_shim());
  var highRiskCase = {
    id: "case-001",
    youthName: "Mira K.",
    channel: "WhatsApp",
    riskLevel: "high",
    riskScore: 87,
    lastActive: "2 hours ago",
    suggestedAction: "Call within the hour — youth expressed thoughts of self-harm during last session.",
    status: "Needs immediate follow-up",
    handoffId: "ho-2024-001",
    conversationSource: "mock-seed",
    concern: "Self-harm ideation and family conflict",
    keyQuote: "I don't see the point anymore. My mum doesn't even care.",
    emotionalState: "Distressed, withdrawn",
    workerResponse: "Acknowledged the pain, validated feelings, provided crisis line",
    whatAiDid: "Listened, reflected emotions, created handoff brief",
    whatNotToRepeat: "Do not ask about the argument again tonight",
    recommendedNextStep: "Check in on housing options and safety plan",
    background: "Ongoing family conflict, first SafeNight contact",
    supportStyle: "Gentle, non-directive",
    conversationPreview: [
      { sender: "youth", author: "Mira", message: "I had a huge fight with my mum. I don't know where I'm going to sleep.", timestamp: "11:38 PM" },
      { sender: "assistant", author: "SafeNight", message: "I'm really glad you reached out. Let's figure out tonight together.", timestamp: "11:39 PM" },
      { sender: "youth", author: "Mira", message: "I just feel like nobody cares about me.", timestamp: "11:41 PM" },
      { sender: "system", author: "System", message: "Risk level elevated — worker handoff created.", timestamp: "11:42 PM" }
    ]
  };
  var mediumRiskCase = {
    id: "case-002",
    youthName: "Jordan T.",
    channel: "Instagram",
    riskLevel: "medium",
    riskScore: 54,
    lastActive: "5 hours ago",
    suggestedAction: "Send a check-in message by noon — youth is stable but isolated.",
    status: "Monitor — follow up by noon",
    handoffId: "ho-2024-002",
    conversationSource: "api-ready",
    concern: "Social isolation and school stress",
    keyQuote: "I just feel like I don't fit in anywhere.",
    emotionalState: "Anxious, lonely",
    workerResponse: "Normalised their experience, explored peer connections",
    whatAiDid: "Active listening, psychoeducation on anxiety",
    whatNotToRepeat: "Avoid suggesting group activities right now",
    recommendedNextStep: "Explore online communities that align with their interests",
    background: "New to the city, recently started at a new school",
    supportStyle: "Warm, curious",
    conversationPreview: [
      { sender: "youth", author: "Jordan", message: "School is so hard. I don't know anyone.", timestamp: "9:15 PM" },
      { sender: "assistant", author: "SafeNight", message: "Starting somewhere new is genuinely hard. What's the hardest part right now?", timestamp: "9:16 PM" },
      { sender: "youth", author: "Jordan", message: "Everyone already has their friend groups. I feel invisible.", timestamp: "9:18 PM" }
    ]
  };
  var HighRiskCase = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 700 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WorkerConversationPreview, { youth: highRiskCase }) });
  var MediumRiskCase = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { padding: 16, maxWidth: 700 }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ds_exports.WorkerConversationPreview, { youth: mediumRiskCase }) });
  return __toCommonJS(WorkerConversationPreview_exports);
})();

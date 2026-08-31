import { createRequire } from "node:module";
var __require = /* @__PURE__ */ createRequire(import.meta.url);

// src/capture.ts
import { copyFile, mkdir, writeFile } from "node:fs/promises";
import { join as join3, resolve as resolve2 } from "node:path";

// src/exec.ts
import { spawn } from "node:child_process";
function exec(cmd, args, opts = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { cwd: opts.cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += d;
      if (!opts.quiet)
        process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      stderr += d;
      if (!opts.quiet)
        process.stderr.write(d);
    });
    child.on("error", (err) => res({ code: 127, stdout, stderr: stderr + String(err) }));
    child.on("close", (code) => res({ code: code ?? 1, stdout, stderr }));
  });
}
async function execOrThrow(cmd, args, opts = {}) {
  const r = await exec(cmd, args, { quiet: true, ...opts });
  if (r.code !== 0) {
    throw new Error(`${cmd} ${args.join(" ")} exited ${r.code}
${r.stderr || r.stdout}`);
  }
  return r;
}
function parseJsonTail(out) {
  const start = out.search(/[[{]/);
  if (start === -1)
    return null;
  for (let end = out.length;end > start; end--) {
    try {
      return JSON.parse(out.slice(start, end));
    } catch {}
  }
  return null;
}

// src/argent.ts
import { createRequire as createRequire2 } from "node:module";
import { dirname, join } from "node:path";
function resolveBin() {
  if (process.env.GOLDIE_ARGENT_BIN)
    return process.env.GOLDIE_ARGENT_BIN;
  try {
    const require2 = createRequire2(import.meta.url);
    const pkgPath = require2.resolve("@swmansion/argent/package.json");
    const pkg = require2(pkgPath);
    if (pkg.bin?.argent)
      return join(dirname(pkgPath), pkg.bin.argent);
  } catch {}
  return "argent";
}
var BIN = resolveBin();
function flags(args) {
  const out = [];
  for (const [k, v] of Object.entries(args)) {
    if (v === undefined)
      continue;
    out.push(`--${k}`, String(v));
  }
  return out;
}
async function run(tool, args) {
  const r = await execOrThrow(BIN, ["run", tool, "--json", ...flags(args)]);
  const parsed = parseJsonTail(r.stdout);
  return parsed?.data ?? parsed;
}
async function runToFile(tool, args, out) {
  await execOrThrow(BIN, ["run", tool, "--out", out, ...flags(args)]);
  return out;
}
async function flow(pathOrName, udid) {
  const r = await exec(BIN, ["flow", "run", pathOrName, "--device", udid, "--json"], {
    quiet: true
  });
  const raw = parseJsonTail(r.stdout);
  const steps = raw?.steps ?? raw?.report?.steps ?? [];
  const failed = steps.find((s) => s.status === "fail" || s.status === "error") ?? null;
  return { ok: r.code === 0, raw, steps, failed, stdout: r.stdout + r.stderr };
}
async function watermarkDisabled() {
  const r = await exec(BIN, ["flags"], { quiet: true });
  const line = r.stdout.split(`
`).find((l) => l.includes("video-watermark"));
  return Boolean(line && /disabled/.test(line));
}
async function restartServer() {
  await exec(BIN, ["server", "stop"], { quiet: true });
  await new Promise((r) => setTimeout(r, 1500));
}
async function available() {
  const r = await exec(BIN, ["--version"], { quiet: true });
  return r.code === 0;
}

// src/config.ts
import { existsSync, readFileSync } from "node:fs";
import { dirname as dirname2, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

// src/frame.ts
var FRAME = {
  width: 606,
  height: 1252,
  screen: { x: 24, y: 21, width: 557, height: 1210 },
  screenRadius: 82
};

// src/layouts.ts
var LAYOUT_KEYS = [
  "classic",
  "copy-below",
  "hero",
  "offset",
  "tilt",
  "tilt-right",
  "duo",
  "duo-tilt",
  "panorama",
  "panorama-duo",
  "minimal"
];
var TYPE = {
  headlineSize: 0.082,
  headlineLineHeight: 1.08,
  headlineTracking: -0.0016,
  headlineWeight: 700,
  subheadSize: 0.038,
  subheadLineHeight: 1.3,
  subheadWeight: 400,
  padX: 0.09,
  padTop: 0.055,
  padBottom: 0.05,
  gap: 0.014
};
var BADGE = {
  fontSize: 0.03,
  weight: 700,
  padX: 0.028,
  padY: 0.014,
  inset: 0.045
};
var CLASSIC_BOTTOM_MARGIN = 0.03;
var SCREEN_SHADOW = { blur: 0.06, offsetY: 0.02, color: "rgba(0, 0, 0, 0.28)" };
var single = (d) => [{ widthRatio: 0.84, rotate: 0, capture: "primary", ...d }];
var LAYOUTS = {
  classic: {
    key: "classic",
    label: "Classic",
    description: "Centred copy above a centred device.",
    span: 1,
    copy: { position: "top", align: "center" },
    devices: single({ x: 0.5, y: 0.5, fitBelowCopy: true })
  },
  "copy-below": {
    key: "copy-below",
    label: "Copy below",
    description: "Device hanging from the top edge, copy underneath.",
    span: 1,
    copy: { position: "bottom", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.84, x: 0.5, y: 0.34 })
  },
  hero: {
    key: "hero",
    label: "Hero",
    description: "Copy on top, a large device running off the bottom.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.95, x: 0.5, y: 0.74 })
  },
  offset: {
    key: "offset",
    label: "Offset",
    description: "Left-aligned copy, device pushed to the bottom right.",
    span: 1,
    copy: { position: "top", align: "left", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.9, x: 0.62, y: 0.76 })
  },
  tilt: {
    key: "tilt",
    label: "Tilt",
    description: "Copy on top, device tilted and running off the bottom.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: single({ widthRatio: 0.9, x: 0.5, y: 0.75, rotate: -8 })
  },
  "tilt-right": {
    key: "tilt-right",
    label: "Tilt right",
    description: "Left-aligned copy, device tilted into the bottom right corner.",
    span: 1,
    copy: { position: "top", align: "left", heightRatio: 0.26 },
    devices: single({ widthRatio: 0.9, x: 0.64, y: 0.78, rotate: 10 })
  },
  duo: {
    key: "duo",
    label: "Duo",
    description: "Two screens: a smaller one behind on the left, the main one in front.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: [
      { widthRatio: 0.62, x: 0.3, y: 0.62, rotate: 0, capture: "secondary" },
      { widthRatio: 0.7, x: 0.64, y: 0.72, rotate: 0, capture: "primary" }
    ]
  },
  "duo-tilt": {
    key: "duo-tilt",
    label: "Duo tilt",
    description: "Two tilted screens stepping down diagonally.",
    span: 1,
    copy: { position: "top", align: "center", heightRatio: 0.24 },
    devices: [
      { widthRatio: 0.64, x: 0.3, y: 0.6, rotate: -6, capture: "secondary" },
      { widthRatio: 0.7, x: 0.66, y: 0.74, rotate: -6, capture: "primary" }
    ]
  },
  panorama: {
    key: "panorama",
    label: "Panorama",
    description: "Two tiles: copy on the left, one big tilted device across the seam.",
    span: 2,
    copy: { position: "top", align: "left", heightRatio: 0.3, x: 0.045, widthRatio: 0.86 },
    devices: single({ widthRatio: 1.1, x: 0.56, y: 0.7, rotate: -10 })
  },
  "panorama-duo": {
    key: "panorama-duo",
    label: "Panorama duo",
    description: "Two tiles sharing one headline, a screen on each side leaning inward.",
    span: 2,
    copy: { position: "top", align: "center", heightRatio: 0.24, widthRatio: 1.6 },
    devices: [
      { widthRatio: 0.8, x: 0.27, y: 0.7, rotate: 6, capture: "primary" },
      { widthRatio: 0.8, x: 0.73, y: 0.7, rotate: -6, capture: "secondary" }
    ]
  },
  minimal: {
    key: "minimal",
    label: "Minimal",
    description: "No copy, just the device, large and centred.",
    span: 1,
    copy: { position: "none", align: "center" },
    devices: single({ widthRatio: 0.92, x: 0.5, y: 0.5 })
  }
};
function isLayoutKey(key) {
  return LAYOUT_KEYS.includes(key);
}
var TEMPLATE_KEYS = [
  "uniform",
  "editorial",
  "showcase",
  "magazine",
  "storyboard",
  "dynamic"
];
var TEMPLATES = {
  uniform: {
    key: "uniform",
    label: "Uniform",
    description: "Every tile in the theme's one layout.",
    sequence: []
  },
  editorial: {
    key: "editorial",
    label: "Editorial",
    description: "A panorama opener, then a hero, an offset, a breather and a tilt.",
    sequence: ["panorama", "hero", "offset", "minimal", "tilt"]
  },
  showcase: {
    key: "showcase",
    label: "Showcase",
    description: "Hero first, then tilted and paired screens, ending on a breather.",
    sequence: ["hero", "tilt", "duo", "tilt-right", "minimal"]
  },
  magazine: {
    key: "magazine",
    label: "Magazine",
    description: "Left-aligned copy and copy-below tiles alternating with big devices.",
    sequence: ["offset", "copy-below", "tilt-right", "hero", "minimal"]
  },
  storyboard: {
    key: "storyboard",
    label: "Storyboard",
    description: "A two-screen panorama, then a copy-below, a hero and a breather.",
    sequence: ["panorama-duo", "copy-below", "hero", "minimal", "tilt"]
  },
  dynamic: {
    key: "dynamic",
    label: "Dynamic",
    description: "Everything tilted: a tilt, a tilted pair, a panorama, a breather.",
    sequence: ["tilt", "duo-tilt", "panorama", "minimal", "tilt-right"]
  }
};
function isTemplateKey(key) {
  return TEMPLATE_KEYS.includes(key);
}
function templateSequence(choice) {
  if (!choice)
    return [];
  return Array.isArray(choice) ? choice : TEMPLATES[choice].sequence;
}
function resolveScenes(scenes, opts) {
  const sequence = templateSequence(opts.template);
  const fallback = opts.layout && isLayoutKey(opts.layout) ? opts.layout : "classic";
  return scenes.map((scene, i) => {
    const key = opts.sceneLayouts?.[scene.id] ?? scene.layout ?? (sequence.length ? sequence[i % sequence.length] : undefined) ?? fallback;
    const layout = LAYOUTS[isLayoutKey(key) ? key : "classic"];
    let secondScene = scene.secondScene;
    if (needsSecondCapture(layout) && !secondScene && scenes.length > 1) {
      secondScene = scenes[(i + 1) % scenes.length].id;
    }
    return { scene, layout, secondScene };
  });
}
function compose(spec, tile, theme, opts = {}) {
  const width = tile.width * spec.span;
  const height = tile.height;
  const art = opts.screenOnly ? { width: FRAME.screen.width, height: FRAME.screen.height, screen: { x: 0, y: 0 } } : { width: FRAME.width, height: FRAME.height, screen: FRAME.screen };
  const isClassic = spec.key === "classic";
  const copyHeight = spec.copy.position === "none" ? 0 : tile.height * (isClassic ? theme.copyHeightRatio : spec.copy.heightRatio ?? 0.24);
  const padX = tile.width * TYPE.padX;
  const maxWidth = spec.copy.widthRatio ? tile.width * spec.copy.widthRatio : tile.width - 2 * padX;
  let copy = null;
  if (spec.copy.position !== "none") {
    const x = spec.copy.x !== undefined ? width * spec.copy.x : spec.copy.align === "left" ? padX : width / 2;
    const boxLeft = spec.copy.align === "left" ? x : x - maxWidth / 2;
    const top = spec.copy.position === "top" ? 0 : height - copyHeight;
    copy = {
      position: spec.copy.position,
      align: spec.copy.align,
      x,
      y: spec.copy.position === "top" ? height * TYPE.padTop : height - height * TYPE.padBottom,
      maxWidth,
      box: { left: boxLeft, top, width: maxWidth, height: copyHeight }
    };
  }
  const devices = spec.devices.map((d) => {
    const widthRatio = isClassic ? theme.deviceWidthRatio : d.widthRatio;
    let scale = tile.width * widthRatio / art.width;
    let left;
    let top;
    if (d.fitBelowCopy) {
      const bottomMargin = height * CLASSIC_BOTTOM_MARGIN;
      const available2 = height - copyHeight - bottomMargin;
      scale = Math.min(scale, available2 / art.height);
      left = (width - art.width * scale) / 2;
      top = copyHeight + (available2 - art.height * scale) / 2;
    } else {
      left = width * d.x - art.width * scale / 2;
      top = height * d.y - art.height * scale / 2;
    }
    return {
      frame: { left, top, width: art.width * scale, height: art.height * scale },
      screen: {
        left: left + art.screen.x * scale,
        top: top + art.screen.y * scale,
        width: FRAME.screen.width * scale,
        height: FRAME.screen.height * scale,
        radius: FRAME.screenRadius * scale
      },
      rotate: d.rotate,
      capture: d.capture
    };
  });
  return { width, height, copy, devices };
}
function needsSecondCapture(spec) {
  return spec.devices.some((d) => d.capture === "secondary");
}

// src/config.ts
var FRAME_VARIANTS = ["17-pro-silver", "17-pro-blue", "17-pro-orange"];
function defaultConfigPath() {
  return process.env.GOLDIE_CONFIG ? resolve(process.env.GOLDIE_CONFIG) : resolve(process.cwd(), "goldie.config.ts");
}
async function importConfig(path) {
  try {
    return await import(pathToFileURL(path).href);
  } catch (err) {
    const code = err.code;
    if (code !== "ERR_UNKNOWN_FILE_EXTENSION" && code !== "ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING")
      throw err;
    const { createJiti } = await import("jiti");
    return createJiti(import.meta.url).import(path);
  }
}
async function loadConfig(path = defaultConfigPath()) {
  if (!existsSync(path))
    throw new Error(`No config at ${path}`);
  const mod = await importConfig(path);
  const cfg = mod.default ?? mod.config;
  if (!cfg)
    throw new Error(`${path} has no default export`);
  const root = dirname2(path);
  const loaded = {
    ...cfg,
    root,
    configPath: path,
    flowsDir: cfg.flowsDir ? resolve(root, cfg.flowsDir) : resolve(cfg.appRoot, ".argent/flows"),
    outDir: resolve(root, "out")
  };
  applyDesign(loaded, readDesign(path));
  framePath(loaded);
  validateLayouts(loaded);
  return loaded;
}
function designPath(configPath) {
  return resolve(dirname2(configPath), "goldie.design.json");
}
function readDesign(configPath) {
  const file = designPath(configPath);
  if (!existsSync(file))
    return {};
  try {
    const parsed = JSON.parse(readFileSync(file, "utf8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    throw new Error(`Unreadable ${file}: ${err instanceof Error ? err.message : err}`);
  }
}
function applyDesign(cfg, design) {
  if (design.background) {
    cfg.theme.background = design.background;
    for (const scene of cfg.scenes)
      if (isScreenshot(scene))
        scene.background = undefined;
    if (isDarkBackground(design.background)) {
      cfg.theme.headlineColor = "#FFFFFF";
      cfg.theme.subheadColor = "#D9E1EA";
    }
  }
  if (design.frame) {
    cfg.frame = { variant: design.frame };
    framePath(cfg);
  }
  if (design.fontFamily)
    cfg.theme.fontFamily = design.fontFamily;
  if (design.copy) {
    for (const scene of cfg.scenes) {
      const copy = design.copy[scene.id];
      if (!isScreenshot(scene) || !copy)
        continue;
      if (copy.headline)
        scene.headline = { ...scene.headline, ...copy.headline };
      if (copy.subhead)
        scene.subhead = { ...scene.subhead, ...copy.subhead };
    }
  }
  if (design.order)
    cfg.scenes = reorderScenes(cfg.scenes, design.order);
  if (design.template !== undefined) {
    cfg.theme.template = design.template ? checkedTemplate(design.template) : undefined;
  }
  if (design.layout)
    cfg.theme.layout = checkedLayout(design.layout);
  if (design.screenOnly !== undefined)
    cfg.theme.screenOnly = design.screenOnly;
  if (design.sceneLayouts) {
    const overrides = {};
    for (const scene of cfg.scenes) {
      const key = design.sceneLayouts[scene.id];
      if (isScreenshot(scene) && key)
        overrides[scene.id] = checkedLayout(key);
    }
    cfg.sceneLayouts = { ...cfg.sceneLayouts, ...overrides };
  }
}
function checkedLayout(key) {
  if (!isLayoutKey(key)) {
    throw new Error(`Unknown layout "${key}". Available: ${LAYOUT_KEYS.join(", ")}`);
  }
  return key;
}
function checkedTemplate(key) {
  if (!isTemplateKey(key)) {
    throw new Error(`Unknown template "${key}". Available: ${TEMPLATE_KEYS.join(", ")}`);
  }
  return key;
}
function resolvedScenes(cfg) {
  return resolveScenes(cfg.scenes.filter(isScreenshot), {
    template: cfg.theme.template,
    layout: cfg.theme.layout,
    sceneLayouts: cfg.sceneLayouts
  });
}
function validateLayouts(cfg) {
  if (cfg.theme.layout)
    checkedLayout(cfg.theme.layout);
  const template = cfg.theme.template;
  if (Array.isArray(template))
    for (const key of template)
      checkedLayout(key);
  else if (template)
    checkedTemplate(template);
  const shots = cfg.scenes.filter(isScreenshot);
  for (const { scene, layout, secondScene } of resolvedScenes(cfg)) {
    if (scene.layout)
      checkedLayout(scene.layout);
    if (!needsSecondCapture(layout))
      continue;
    if (!secondScene) {
      throw new Error(`Scene "${scene.id}" uses the "${layout.key}" layout, which shows two screens, but there is no other scene to borrow from.`);
    }
    if (secondScene === scene.id || !shots.some((s) => s.id === secondScene)) {
      throw new Error(`Scene "${scene.id}": secondScene "${secondScene}" is not another screenshot scene.`);
    }
  }
}
function reorderScenes(scenes, order) {
  const shots = scenes.filter(isScreenshot);
  const rank = new Map(order.map((id, i2) => [id, i2]));
  const sorted = [...shots].sort((a, b) => {
    const ra = rank.get(a.id) ?? Number.POSITIVE_INFINITY;
    const rb = rank.get(b.id) ?? Number.POSITIVE_INFINITY;
    return ra === rb ? shots.indexOf(a) - shots.indexOf(b) : ra - rb;
  });
  let i = 0;
  return scenes.map((s) => isScreenshot(s) ? sorted[i++] : s);
}
function isDarkBackground(css) {
  const hexes = css.match(/#[0-9a-fA-F]{6}/g);
  if (!hexes || hexes.length === 0)
    return false;
  const luminance = (hex) => {
    const channel = (offset) => {
      const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  };
  return hexes.reduce((sum, hex) => sum + luminance(hex), 0) / hexes.length < 0.5;
}
var GOLDIE_ROOT = resolve(dirname2(fileURLToPath(import.meta.url)), "..");
function variantFramePath(variant) {
  return resolve(GOLDIE_ROOT, "assets", `${variant}.png`);
}
function framePath(cfg) {
  let file;
  if ("variant" in cfg.frame) {
    if (!FRAME_VARIANTS.includes(cfg.frame.variant)) {
      throw new Error(`Unknown frame variant "${cfg.frame.variant}". Available: ${FRAME_VARIANTS.join(", ")}`);
    }
    file = variantFramePath(cfg.frame.variant);
  } else {
    file = resolve(cfg.root, cfg.frame.image);
  }
  if (!existsSync(file))
    throw new Error(`Frame image not found: ${file}`);
  return file;
}
function flowPath(cfg, flow2) {
  const file = flow2.endsWith(".yaml") || flow2.endsWith(".yml") ? flow2 : `${flow2}.yaml`;
  return resolve(cfg.flowsDir, file);
}
var isPreview = (s) => s.kind === "preview";
var isScreenshot = (s) => s.kind === "screenshot";

// src/device.ts
import { homedir } from "node:os";
import { join as join2 } from "node:path";

// src/specs.ts
var DEVICES = {
  "iphone-6.9": {
    label: "6.9",
    simulatorName: "iPhone 17 Pro Max",
    native: { width: 1320, height: 2868 },
    screenshot: { width: 1320, height: 2868 },
    preview: { width: 886, height: 1920 }
  }
};
var PREVIEW = {
  fps: 30,
  minSeconds: 15,
  maxSeconds: 30,
  videoBitrate: "11M",
  audioBitrate: "256k",
  audioSampleRate: 48000,
  maxBytes: 500 * 1024 * 1024
};
var SCREENSHOT_PIXEL_FORMAT = "rgb24";

// src/device.ts
async function simctlDevices() {
  const r = await execOrThrow("xcrun", ["simctl", "list", "devices", "available", "--json"]);
  return JSON.parse(r.stdout).devices;
}
async function resolveUdid(key) {
  const spec = DEVICES[key];
  const byRuntime = await simctlDevices();
  const runtimes = Object.keys(byRuntime).filter((r) => r.includes("iOS")).sort(compareRuntime);
  for (const runtime of runtimes) {
    const hit = byRuntime[runtime]?.find((d) => d.name === spec.simulatorName);
    if (hit)
      return hit.udid;
  }
  throw new Error(`No "${spec.simulatorName}" simulator installed. Add one in Xcode > Settings > Components, ` + `or run: xcrun simctl create "${spec.simulatorName}" "${spec.simulatorName}"`);
}
function compareRuntime(a, b) {
  const nums = (s) => (s.match(/\d+/g) ?? []).map(Number);
  const [an, bn] = [nums(a), nums(b)];
  for (let i = 0;i < Math.max(an.length, bn.length); i++) {
    const d = (bn[i] ?? 0) - (an[i] ?? 0);
    if (d !== 0)
      return d;
  }
  return 0;
}
async function boot(udid) {
  await run("boot-device", { udid });
}
async function shutdown(udid) {
  await exec("xcrun", ["simctl", "shutdown", udid], { quiet: true });
}
function keyboardAndLocalePrefs(locale) {
  const language = locale.split("-")[0];
  const off = (domain, key) => ({
    domain,
    key,
    write: ["-bool", "false"],
    expect: "0"
  });
  return [
    off("com.apple.Preferences", "KeyboardAutocorrection"),
    off("com.apple.Preferences", "KeyboardPrediction"),
    off("com.apple.Preferences", "KeyboardAutocapitalization"),
    off("com.apple.keyboard.preferences", "KeyboardAutocorrection"),
    off("com.apple.keyboard.preferences", "KeyboardPrediction"),
    {
      domain: ".GlobalPreferences",
      key: "AppleLocale",
      write: ["-string", locale.replace("-", "_")],
      expect: locale.replace("-", "_")
    },
    {
      domain: ".GlobalPreferences",
      key: "AppleLanguages",
      write: ["-array", language],
      expect: `(${language})`
    }
  ];
}
function prefsDir(udid) {
  return join2(homedir(), "Library/Developer/CoreSimulator/Devices", udid, "data/Library/Preferences");
}
async function pinKeyboardAndLocale(udid, locale) {
  const dir = prefsDir(udid);
  for (const pref of keyboardAndLocalePrefs(locale)) {
    await execOrThrow("defaults", ["write", join2(dir, pref.domain), pref.key, ...pref.write]);
  }
}
async function keyboardAndLocalePinned(udid, locale) {
  const dir = prefsDir(udid);
  for (const pref of keyboardAndLocalePrefs(locale)) {
    const r = await exec("defaults", ["read", join2(dir, pref.domain), pref.key], { quiet: true });
    if (r.code !== 0)
      return false;
    if (r.stdout.replace(/\s+/g, "") !== pref.expect)
      return false;
  }
  return true;
}
async function pinStatusBar(udid) {
  await execOrThrow("xcrun", [
    "simctl",
    "status_bar",
    udid,
    "override",
    "--time",
    "9:41",
    "--batteryState",
    "charged",
    "--batteryLevel",
    "100",
    "--wifiMode",
    "active",
    "--wifiBars",
    "3",
    "--cellularMode",
    "active",
    "--cellularBars",
    "4",
    "--dataNetwork",
    "5g"
  ]);
}
async function clearStatusBar(udid) {
  await exec("xcrun", ["simctl", "status_bar", udid, "clear"], { quiet: true });
}
async function setAppearance(udid, appearance) {
  await execOrThrow("xcrun", ["simctl", "ui", udid, "appearance", appearance]);
}
async function isBooted(udid) {
  const byRuntime = await simctlDevices();
  for (const list of Object.values(byRuntime)) {
    const hit = list.find((d) => d.udid === udid);
    if (hit)
      return hit.state === "Booted";
  }
  return false;
}
async function prepare(udid, locale, appearance) {
  const booted = await isBooted(udid);
  if (!booted || !await keyboardAndLocalePinned(udid, locale)) {
    if (booted)
      console.log("  rebooting to pin the keyboard and locale");
    await run("stop-simulator-server", { udid }).catch(() => {});
    await shutdown(udid);
    await pinKeyboardAndLocale(udid, locale);
    await boot(udid);
    await restartServer();
  }
  await setAppearance(udid, appearance);
  await pinStatusBar(udid);
}
async function warmUp(udid, bundleId) {
  await run("launch-app", { udid, bundleId }).catch(() => {});
  await run("await-screen-idle", { udid, timeoutMs: 60000 }).catch(() => {});
}
async function installApp(udid, appPath, bundleId) {
  await run("reinstall-app", { udid, bundleId, appPath });
}

// src/repair.ts
class FlowFailure extends Error {
  sceneId;
  flowPath;
  udid;
  report;
  constructor(sceneId, flowPath2, udid, report) {
    super(`Flow failed for scene "${sceneId}" (${flowPath2})`);
    this.sceneId = sceneId;
    this.flowPath = flowPath2;
    this.udid = udid;
    this.report = report;
    this.name = "FlowFailure";
  }
}
function repairBrief(failure) {
  const step = failure.report.failed;
  const lines = [
    "",
    `FLOW FAILED  scene "${failure.sceneId}"`,
    `  file    ${failure.flowPath}`,
    `  device  ${failure.udid}`
  ];
  if (step) {
    lines.push(`  step    #${step.index ?? "?"} ${describe(step)}`);
    if (step.reason)
      lines.push(`  reason  ${step.reason}`);
    if (step.error)
      lines.push(`  error   ${step.error}`);
  } else {
    lines.push("  step    (no step-level failure in the report - see output below)");
    lines.push(indent(failure.report.stdout.trim().split(`
`).slice(-15).join(`
`)));
  }
  lines.push("", "To repair:", `  1. argent run describe --udid ${failure.udid}`, "  2. Find the element the step meant to hit and note its text or identifier.", `  3. Edit ${failure.flowPath} - prefer a text:/id: selector over coordinates.`, `  4. argent flow run ${failure.flowPath} --device ${failure.udid}`, "", "Claude can do steps 1-3 over argent MCP with describe / flow-start-recording /", "flow-add-step, but the edited YAML is yours to review before it is committed.", "");
  return lines.join(`
`);
}
function describe(step) {
  const parts = [step.kind ?? step.tool ?? "step", step.target ?? ""].filter(Boolean);
  return parts.join(" ").trim();
}
var indent = (s) => s.split(`
`).map((l) => `          ${l}`).join(`
`);

// src/capture.ts
async function runFlow(path, udid) {
  const first = await flow(path, udid);
  if (first.ok || first.failed?.kind !== "launch")
    return first;
  console.log("    launch raced the devtools handshake, retrying once");
  return flow(path, udid);
}
async function capture(cfg, deviceKey) {
  const spec = DEVICES[deviceKey];
  const udid = await resolveUdid(deviceKey);
  const rawDir = join3(cfg.outDir, "raw", deviceKey);
  await mkdir(rawDir, { recursive: true });
  console.log(`> ${spec.simulatorName} (${udid})`);
  await prepare(udid, cfg.locales[0], cfg.appearance);
  await installApp(udid, resolve2(cfg.root, cfg.appPath), cfg.bundleId);
  await warmUp(udid, cfg.bundleId);
  const manifest = {
    device: deviceKey,
    udid,
    capturedAt: new Date().toISOString(),
    screenshots: [],
    preview: null
  };
  for (const scene of cfg.scenes.filter(isScreenshot)) {
    console.log(`  screenshot ${scene.id}`);
    const report = await runFlow(flowPath(cfg, scene.flow), udid);
    if (!report.ok)
      throw new FlowFailure(scene.id, flowPath(cfg, scene.flow), udid, report);
    await pinStatusBar(udid);
    await sleep(800);
    await pinStatusBar(udid);
    await sleep(400);
    const file = join3(rawDir, `${scene.id}.png`);
    await runToFile("screenshot", { udid, scale: 1, includeImageInContext: false }, file);
    await assertSize(file, spec.native.width, spec.native.height);
    manifest.screenshots.push({ sceneId: scene.id, file });
  }
  const previewScene = cfg.scenes.find(isPreview);
  if (previewScene)
    manifest.preview = await captureSegments(cfg, previewScene, udid, rawDir);
  await writeFile(join3(rawDir, "manifest.json"), JSON.stringify(manifest, null, 2));
  return manifest;
}
async function captureSegments(cfg, scene, udid, rawDir) {
  const clips = [];
  await run("restart-app", { udid, bundleId: cfg.bundleId });
  await run("await-screen-idle", { udid, timeoutMs: 60000 }).catch(() => {});
  for (const segment of scene.segments) {
    console.log(`  preview segment ${segment.id}`);
    const file = join3(rawDir, `${scene.id}-${segment.id}.mp4`);
    await pinStatusBar(udid);
    await run("screen-recording-start", {
      udid,
      timeLimitSeconds: 120,
      trimStatic: false,
      showTouches: false
    });
    let failure = null;
    let stopped = null;
    try {
      const report = await runFlow(flowPath(cfg, segment.flow), udid);
      if (!report.ok)
        failure = new FlowFailure(`${scene.id}/${segment.id}`, flowPath(cfg, segment.flow), udid, report);
      if (segment.holdSeconds)
        await sleep(segment.holdSeconds * 1000);
    } finally {
      stopped = await run("screen-recording-stop", {
        udid
      });
    }
    if (failure)
      throw failure;
    await copyFile(stopped.video, file);
    clips.push({ segmentId: segment.id, file, durationSeconds: stopped.durationMs / 1000 });
  }
  return { sceneId: scene.id, clips };
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function assertSize(file, width, height) {
  const r = await execOrThrow("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  const got = {
    width: Number(r.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]),
    height: Number(r.stdout.match(/pixelHeight:\s*(\d+)/)?.[1])
  };
  if (got.width !== width || got.height !== height) {
    throw new Error(`${file} is ${got.width}x${got.height}, expected ${width}x${height}. ` + `Either the simulator is not the device the spec names, or ARGENT_SCREENSHOT_SCALE is set.`);
  }
}
// src/doctor.ts
import { existsSync as existsSync2 } from "node:fs";
import { resolve as resolve3 } from "node:path";
async function onPath(bin, args = ["--version"]) {
  return (await exec(bin, args, { quiet: true })).code === 0;
}
async function doctor(cfg) {
  const checks = [];
  checks.push({
    name: "xcrun",
    ok: await onPath("xcrun", ["simctl", "help"]),
    detail: "iOS simulator control",
    fix: "Install Xcode and run: xcode-select --install"
  });
  checks.push({
    name: "ffmpeg",
    ok: await onPath("ffmpeg", ["-version"]),
    detail: "recording and pixel-format conversion",
    fix: "brew install ffmpeg"
  });
  checks.push({
    name: "ffprobe",
    ok: await onPath("ffprobe", ["-version"]),
    detail: "output verification",
    fix: "brew install ffmpeg"
  });
  checks.push({
    name: "argent",
    ok: await available(),
    detail: "device driver",
    fix: "npm i -g @swmansion/argent   (or set GOLDIE_ARGENT_BIN)"
  });
  const watermarkOff = await watermarkDisabled().catch(() => false);
  checks.push({
    name: "video-watermark",
    ok: watermarkOff,
    detail: watermarkOff ? "disabled" : "ENABLED - previews would carry the argent watermark",
    fix: "argent disable video-watermark"
  });
  const scale = process.env.ARGENT_SCREENSHOT_SCALE;
  checks.push({
    name: "ARGENT_SCREENSHOT_SCALE",
    ok: scale === undefined || Number(scale) === 1,
    detail: scale ? `set to ${scale}` : "unset (captures pass scale=1.0 explicitly)",
    fix: "unset ARGENT_SCREENSHOT_SCALE"
  });
  const appPath = resolve3(cfg.root, cfg.appPath);
  checks.push({
    name: "app build",
    ok: existsSync2(appPath),
    detail: appPath,
    fix: `Build it: (cd ${cfg.appRoot} && npx expo run:ios --configuration Release)`
  });
  const isDebug = /Debug-iphonesimulator/.test(appPath);
  checks.push({
    name: "release build",
    ok: !isDebug,
    warnOnly: true,
    detail: isDebug ? "app is a Debug build: it requires Metro and paints dev warning banners into captures" : "release build",
    fix: `(cd ${cfg.appRoot} && npx expo run:ios --configuration Release) then point appPath at the Release-iphonesimulator .app`
  });
  for (const key of cfg.devices) {
    const spec = DEVICES[key];
    const udid = await resolveUdid(key).catch(() => null);
    checks.push({
      name: `simulator ${spec.simulatorName}`,
      ok: Boolean(udid),
      detail: udid ?? "not installed",
      fix: `xcrun simctl create "${spec.simulatorName}" "${spec.simulatorName}"`
    });
  }
  checks.push({
    name: "flows dir",
    ok: existsSync2(cfg.flowsDir),
    detail: cfg.flowsDir,
    fix: `mkdir -p ${cfg.flowsDir}   (or set flowsDir in goldie.config.ts)`
  });
  for (const scene of cfg.scenes) {
    const flows = scene.kind === "preview" ? scene.segments.map((s) => s.flow) : [scene.flow];
    for (const f of flows) {
      const path = flowPath(cfg, f);
      checks.push({
        name: `flow ${f}`,
        ok: existsSync2(path),
        detail: path,
        fix: "Record or author it under the flows dir, or fix the name in goldie.config.ts"
      });
    }
  }
  let allOk = true;
  for (const c of checks) {
    if (!c.ok && !c.warnOnly)
      allOk = false;
    const label = c.ok ? "  ok  " : c.warnOnly ? "  warn" : "  FAIL";
    console.log(`${label} ${c.name.padEnd(30)} ${c.detail}`);
    if (!c.ok && c.fix)
      console.log(`       fix: ${c.fix}`);
  }
  return allOk;
}
// src/manifest.ts
import { copyFile as copyFile2, mkdir as mkdir2, readdir, readFile, rm, stat, symlink, writeFile as writeFile2 } from "node:fs/promises";
import { basename, dirname as dirname4, join as join4, relative, resolve as resolve5 } from "node:path";

// src/fonts.ts
import { dirname as dirname3, resolve as resolve4 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { GlobalFonts } from "@napi-rs/canvas";
var FONTS = {
  merriweather: {
    family: "Merriweather",
    fallback: "Georgia, serif",
    files: { 400: "Merriweather-400.ttf", 700: "Merriweather-700.ttf" }
  },
  "dm-mono": {
    family: "DM Mono",
    fallback: "ui-monospace, Menlo, monospace",
    files: { 400: "DMMono-400.ttf", 500: "DMMono-500.ttf" }
  },
  lato: {
    family: "Lato",
    fallback: "system-ui, sans-serif",
    files: { 400: "Lato-400.ttf", 700: "Lato-700.ttf" }
  },
  "dm-sans": {
    family: "DM Sans",
    fallback: "system-ui, sans-serif",
    files: { 400: "DMSans-400.ttf", 700: "DMSans-700.ttf" }
  },
  montserrat: {
    family: "Montserrat",
    fallback: "system-ui, sans-serif",
    files: { 400: "Montserrat-400.ttf", 700: "Montserrat-700.ttf" }
  }
};
var FONT_KEYS = Object.keys(FONTS);
var SYSTEM_FONT = '-apple-system, "SF Pro Display", system-ui, sans-serif';
var FONTS_DIR = resolve4(dirname3(fileURLToPath2(import.meta.url)), "..", "assets", "fonts");
function fontFilePath(file) {
  return resolve4(FONTS_DIR, file);
}
function fontStack(key) {
  if (key === "system")
    return SYSTEM_FONT;
  const font = FONTS[key];
  if (!font) {
    throw new Error(`Unknown font "${key}". Available: system, ${FONT_KEYS.join(", ")}`);
  }
  return `"${font.family}", ${font.fallback}`;
}
var registered = false;
function registerFonts() {
  if (registered)
    return;
  registered = true;
  for (const font of Object.values(FONTS)) {
    for (const file of Object.values(font.files)) {
      GlobalFonts.registerFromPath(fontFilePath(file), font.family);
    }
  }
}

// src/manifest.ts
var WEB_DIR = "web";
async function writeManifest(cfg) {
  const webDir = join4(cfg.outDir, WEB_DIR);
  await mkdir2(webDir, { recursive: true });
  await link(join4(cfg.outDir, "screenshots"), join4(webDir, "screenshots"));
  await link(join4(cfg.outDir, "previews"), join4(webDir, "previews"));
  await link(join4(cfg.outDir, "raw"), join4(webDir, "raw"));
  const framesDir = join4(webDir, "frames");
  await mkdir2(framesDir, { recursive: true });
  for (const variant of FRAME_VARIANTS) {
    await copyFile2(variantFramePath(variant), join4(framesDir, `${variant}.png`));
  }
  const custom = "variant" in cfg.frame ? null : "frames/custom.png";
  if (custom)
    await copyFile2(framePath(cfg), join4(webDir, custom));
  const fontsDir = join4(webDir, "fonts");
  await mkdir2(fontsDir, { recursive: true });
  const fonts = [];
  for (const [key, font] of Object.entries(FONTS)) {
    const faces = [];
    for (const [weight, file2] of Object.entries(font.files)) {
      await copyFile2(fontFilePath(file2), join4(fontsDir, file2));
      faces.push({ weight: Number(weight), url: `fonts/${file2}` });
    }
    fonts.push({ key, family: font.family, fallback: font.fallback, faces });
  }
  const decorDir = join4(webDir, "decor");
  await mkdir2(decorDir, { recursive: true });
  const webDecorations = async (list) => Promise.all((list ?? []).map(async (d) => {
    if (d.kind !== "image")
      return d;
    const name = basename(d.src);
    await copyFile2(resolve5(cfg.root, d.src), join4(decorDir, name));
    return { ...d, src: `decor/${name}` };
  }));
  const scenes = [];
  for (const scene of cfg.scenes.filter(isScreenshot)) {
    scenes.push({
      id: scene.id,
      headline: scene.headline,
      ...scene.subhead ? { subhead: scene.subhead } : {},
      ...scene.layout ? { layout: scene.layout } : {},
      ...scene.secondScene ? { secondScene: scene.secondScene } : {},
      ...scene.decorations ? { decorations: await webDecorations(scene.decorations) } : {}
    });
  }
  const assets = {};
  for (const deviceKey of cfg.devices) {
    assets[deviceKey] = {};
    for (const locale of cfg.locales) {
      assets[deviceKey][locale] = await collect(cfg, deviceKey, locale);
    }
  }
  const captures = {};
  for (const deviceKey of cfg.devices) {
    const raw = await readCaptureManifest(cfg, deviceKey);
    if (!raw)
      continue;
    captures[deviceKey] = {
      screenshots: raw.screenshots.map((s) => ({
        sceneId: s.sceneId,
        url: `raw/${deviceKey}/${basename(s.file)}`
      })),
      clips: raw.preview ? raw.preview.clips.map((c) => ({
        segmentId: c.segmentId,
        url: `raw/${deviceKey}/${basename(c.file)}`,
        durationSeconds: c.durationSeconds
      })) : null
    };
  }
  const previewScene = cfg.scenes.find(isPreview);
  const manifest = {
    generatedAt: new Date().toISOString(),
    app: { ...cfg.store },
    devices: cfg.devices.map((key) => ({
      key,
      label: DEVICES[key].label,
      simulatorName: DEVICES[key].simulatorName,
      screenshot: DEVICES[key].screenshot,
      preview: DEVICES[key].preview
    })),
    locales: cfg.locales,
    assets,
    design: {
      theme: cfg.theme,
      frameVariant: "variant" in cfg.frame ? cfg.frame.variant : null,
      frameVariants: [...FRAME_VARIANTS],
      customFrameUrl: custom,
      fonts,
      layouts: Object.values(LAYOUTS).map(({ key, label, description, span }) => ({
        key,
        label,
        description,
        span
      })),
      templates: Object.values(TEMPLATES),
      template: cfg.theme.template ?? null,
      layout: cfg.theme.layout ?? "classic",
      screenOnly: cfg.theme.screenOnly ?? false,
      decorations: await webDecorations(cfg.theme.decorations),
      scenes,
      preview: previewScene ? {
        sceneId: previewScene.id,
        segments: previewScene.segments.map(({ id }) => ({ id }))
      } : null,
      captures
    }
  };
  const file = join4(webDir, "store.json");
  await writeFile2(file, JSON.stringify(manifest, null, 2));
  return file;
}
async function readCaptureManifest(cfg, deviceKey) {
  try {
    return JSON.parse(await readFile(join4(cfg.outDir, "raw", deviceKey, "manifest.json"), "utf8"));
  } catch {
    return null;
  }
}
async function collect(cfg, deviceKey, locale) {
  const label = DEVICES[deviceKey].label;
  const shotDir = join4(cfg.outDir, "screenshots", label, locale);
  const previewDir = join4(cfg.outDir, "previews", label, locale);
  const sceneOrder = cfg.scenes.filter(isScreenshot).map((s) => s.id);
  const screenshots = [];
  for (const name of (await ls(shotDir)).filter((f) => f.endsWith(".png")).sort()) {
    const file = join4(shotDir, name);
    const { width, height } = await imageSize(file);
    const sceneId = sceneOrder.find((id) => name.includes(id)) ?? basename(name, ".png");
    screenshots.push({
      sceneId,
      url: `screenshots/${label}/${locale}/${name}`,
      width,
      height,
      bytes: (await stat(file)).size
    });
  }
  const previewScene = cfg.scenes.find(isPreview);
  const previewName = (await ls(previewDir)).find((f) => f.endsWith(".mp4"));
  let preview = null;
  if (previewScene && previewName) {
    const file = join4(previewDir, previewName);
    const probe = await videoInfo(file);
    preview = {
      sceneId: previewScene.id,
      url: `previews/${label}/${locale}/${previewName}`,
      ...probe,
      bytes: (await stat(file)).size
    };
  }
  return { screenshots, preview };
}
var ls = async (dir) => readdir(dir).catch(() => []);
async function link(target, path) {
  await rm(path, { recursive: true, force: true });
  await symlink(relative(dirname4(path), target), path, "dir");
}
async function imageSize(file) {
  const r = await execOrThrow("sips", ["-g", "pixelWidth", "-g", "pixelHeight", file]);
  return {
    width: Number(r.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]),
    height: Number(r.stdout.match(/pixelHeight:\s*(\d+)/)?.[1])
  };
}
async function videoInfo(file) {
  const r = await execOrThrow("ffprobe", [
    "-v",
    "error",
    "-select_streams",
    "v:0",
    "-show_entries",
    "stream=width,height:format=duration",
    "-of",
    "json",
    file
  ]);
  const probe = JSON.parse(r.stdout);
  return {
    width: probe.streams[0].width,
    height: probe.streams[0].height,
    durationSeconds: Number(probe.format.duration)
  };
}
// src/render.ts
import { mkdir as mkdir3, readdir as readdir2, readFile as readFile2, rm as rm2, stat as stat2, writeFile as writeFile3 } from "node:fs/promises";
import { basename as basename2, join as join5, resolve as resolve6 } from "node:path";
import {
  createCanvas,
  loadImage
} from "@napi-rs/canvas";
async function readManifest(cfg, deviceKey) {
  const file = join5(cfg.outDir, "raw", deviceKey, "manifest.json");
  try {
    return JSON.parse(await readFile2(file, "utf8"));
  } catch {
    throw new Error(`No capture manifest at ${file}. Run: goldie capture`);
  }
}
async function renderScreenshots(cfg, deviceKey, locale) {
  const spec = DEVICES[deviceKey];
  const manifest = await readManifest(cfg, deviceKey);
  const outDir = join5(cfg.outDir, "screenshots", spec.label, locale);
  await mkdir3(outDir, { recursive: true });
  for (const name of await readdir2(outDir)) {
    if (name.endsWith(".png"))
      await rm2(join5(outDir, name), { force: true });
  }
  const bezel = cfg.theme.screenOnly ? null : await loadImage(framePath(cfg));
  registerFonts();
  const tile = spec.screenshot;
  const findShot = (sceneId) => {
    const shot = manifest.screenshots.find((s) => s.sceneId === sceneId);
    if (!shot)
      throw new Error(`Scene "${sceneId}" is in the config but not in the capture manifest.`);
    return shot;
  };
  let slot = 0;
  const jobs = resolvedScenes(cfg).map((r) => {
    const first = slot;
    slot += r.layout.span;
    return { ...r, first };
  });
  const files = await Promise.all(jobs.map(async ({ scene, layout, secondScene, first }) => {
    console.log(`  frame ${scene.id}`);
    const c = compose(layout, tile, cfg.theme, { screenOnly: cfg.theme.screenOnly });
    const canvas = createCanvas(c.width, c.height);
    const ctx = canvas.getContext("2d");
    const background = scene.background ?? cfg.theme.background;
    const transparent = isTransparent(background);
    if (!transparent) {
      ctx.fillStyle = paint(ctx, background, c.width, c.height);
      ctx.fillRect(0, 0, c.width, c.height);
    }
    if (c.copy) {
      drawCopy(ctx, c.copy, tile, cfg.theme, {
        headline: pick(scene.headline, locale, scene.id, "headline"),
        subhead: scene.subhead ? pick(scene.subhead, locale, scene.id, "subhead") : undefined
      });
    }
    await drawDecorations(ctx, cfg, [...cfg.theme.decorations ?? [], ...scene.decorations ?? []], c, tile, locale, scene.id);
    for (const device of c.devices) {
      const sceneId = device.capture === "secondary" ? secondScene : scene.id;
      const capture2 = await loadImage(findShot(sceneId).file);
      drawDevice(ctx, device, capture2, bezel, tile);
    }
    const out = [];
    for (let i = 0;i < layout.span; i++) {
      const slice = createCanvas(tile.width, tile.height);
      slice.getContext("2d").drawImage(canvas, -i * tile.width, 0);
      const suffix = layout.span > 1 ? `-${i + 1}` : "";
      const name = `${String(first + i + 1).padStart(2, "0")}-${scene.id}${suffix}.png`;
      out.push(await writePng(slice, outDir, name, transparent));
    }
    return out;
  }));
  return files.flat();
}
async function writePng(canvas, outDir, name, keepAlpha = false) {
  const final = join5(outDir, name);
  if (keepAlpha) {
    await writeFile3(final, await canvas.encode("png"));
    return final;
  }
  const raw = join5(outDir, `.${name}.rgba.png`);
  await writeFile3(raw, await canvas.encode("png"));
  await execOrThrow("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-i",
    raw,
    "-pix_fmt",
    SCREENSHOT_PIXEL_FORMAT,
    final
  ]);
  await rm2(raw, { force: true });
  return final;
}
function drawCopy(ctx, copy, tile, theme, text) {
  const blocks = [
    {
      text: text.headline,
      font: `${TYPE.headlineWeight} ${tile.width * TYPE.headlineSize}px ${theme.fontFamily}`,
      color: theme.headlineColor,
      lineHeight: TYPE.headlineLineHeight,
      letterSpacing: tile.width * TYPE.headlineTracking
    },
    ...text.subhead ? [
      {
        text: text.subhead,
        font: `${TYPE.subheadWeight} ${tile.width * TYPE.subheadSize}px ${theme.fontFamily}`,
        color: theme.subheadColor,
        lineHeight: TYPE.subheadLineHeight,
        letterSpacing: 0
      }
    ] : []
  ].map((b) => ({ ...b, lines: wrapLines(ctx, b.text, b.font, b.letterSpacing, copy.maxWidth) }));
  const gap = tile.height * TYPE.gap;
  const total = blocks.reduce((sum, b) => sum + b.lines.length * fontSize(b.font) * b.lineHeight, 0) + gap * (blocks.length - 1);
  let y = copy.position === "top" ? copy.y : copy.y - total;
  for (const b of blocks) {
    y = drawLines(ctx, { ...b, x: copy.x, y, align: copy.align });
    y += gap;
  }
}
function drawDevice(ctx, device, capture2, bezel, tile) {
  const { frame, screen } = device;
  ctx.save();
  if (device.rotate) {
    const cx = frame.left + frame.width / 2;
    const cy = frame.top + frame.height / 2;
    ctx.translate(cx, cy);
    ctx.rotate(device.rotate * Math.PI / 180);
    ctx.translate(-cx, -cy);
  }
  if (!bezel) {
    ctx.save();
    ctx.shadowColor = SCREEN_SHADOW.color;
    ctx.shadowBlur = tile.width * SCREEN_SHADOW.blur;
    ctx.shadowOffsetY = tile.width * SCREEN_SHADOW.offsetY;
    ctx.fillStyle = "#000";
    ctx.beginPath();
    ctx.roundRect(screen.left, screen.top, screen.width, screen.height, screen.radius);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(screen.left, screen.top, screen.width, screen.height, screen.radius);
  ctx.clip();
  const scale = Math.max(screen.width / capture2.width, screen.height / capture2.height);
  const w = capture2.width * scale;
  const h = capture2.height * scale;
  ctx.drawImage(capture2, screen.left + (screen.width - w) / 2, screen.top + (screen.height - h) / 2, w, h);
  ctx.restore();
  if (bezel)
    ctx.drawImage(bezel, frame.left, frame.top, frame.width, frame.height);
  ctx.restore();
}
async function drawDecorations(ctx, cfg, decorations, c, tile, locale, sceneId) {
  for (const d of decorations) {
    if (d.kind === "badge") {
      const text = pick(d.text, locale, sceneId, "badge");
      const font = `${BADGE.weight} ${tile.width * BADGE.fontSize}px ${cfg.theme.fontFamily}`;
      ctx.font = font;
      ctx.letterSpacing = "0px";
      const size = fontSize(font);
      const w = ctx.measureText(text).width + 2 * tile.width * BADGE.padX;
      const h = size * 1.2 + 2 * tile.width * BADGE.padY;
      const inset = Math.min(tile.width, tile.height) * BADGE.inset;
      const left = d.position.endsWith("left") ? inset : c.width - inset - w;
      const top = d.position.startsWith("top") ? inset : c.height - inset - h;
      ctx.fillStyle = d.background ?? "rgba(255, 255, 255, 0.85)";
      ctx.beginPath();
      ctx.roundRect(left, top, w, h, h / 2);
      ctx.fill();
      ctx.fillStyle = d.color ?? cfg.theme.headlineColor;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, left + w / 2, top + h / 2);
    } else {
      const image = await loadImage(resolve6(cfg.root, d.src));
      const w = tile.width * d.width;
      const h = w * image.height / image.width;
      const left = tile.width * d.x;
      const top = tile.height * d.y;
      ctx.save();
      if (d.rotate) {
        ctx.translate(left + w / 2, top + h / 2);
        ctx.rotate(d.rotate * Math.PI / 180);
        ctx.translate(-(left + w / 2), -(top + h / 2));
      }
      ctx.drawImage(image, left, top, w, h);
      ctx.restore();
    }
  }
}
var fontSize = (font) => Number(font.match(/(\d+(?:\.\d+)?)px/)?.[1]);
function wrapLines(ctx, text, font, letterSpacing, maxWidth) {
  ctx.font = font;
  ctx.letterSpacing = `${letterSpacing}px`;
  const lines = [];
  for (const paragraph of text.split(`
`)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (line && ctx.measureText(next).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = next;
      }
    }
    lines.push(line);
  }
  return lines;
}
function drawLines(ctx, o) {
  ctx.font = o.font;
  ctx.fillStyle = o.color;
  ctx.textAlign = o.align;
  ctx.textBaseline = "top";
  ctx.letterSpacing = `${o.letterSpacing}px`;
  const size = fontSize(o.font);
  const step = size * o.lineHeight;
  let y = o.y;
  for (const line of o.lines) {
    ctx.fillText(line, o.x, y + (step - size) / 2);
    y += step;
  }
  return y;
}
function isTransparent(css) {
  return css.trim().toLowerCase() === "transparent";
}
function paint(ctx, css, width, height) {
  const m = css.trim().match(/^linear-gradient\((.*)\)$/s);
  if (!m)
    return css;
  const parts = splitTopLevel(m[1]);
  let angle = 180;
  const first = parts[0].trim();
  const deg = first.match(/^(-?\d+(?:\.\d+)?)deg$/);
  if (deg) {
    angle = Number(deg[1]);
    parts.shift();
  } else if (first.startsWith("to ")) {
    const sides = { top: 0, right: 90, bottom: 180, left: 270 };
    const words = first.slice(3).split(/\s+/);
    const angles = words.map((w) => sides[w]).filter((a) => a !== undefined);
    if (angles.length === 2 && angles.includes(0) && angles.includes(270))
      angle = 315;
    else if (angles.length === 2)
      angle = (angles[0] + angles[1]) / 2;
    else if (angles.length === 1)
      angle = angles[0];
    parts.shift();
  }
  const rad = angle * Math.PI / 180;
  const length = Math.abs(width * Math.sin(rad)) + Math.abs(height * Math.cos(rad));
  const dx = Math.sin(rad) * length / 2;
  const dy = -Math.cos(rad) * length / 2;
  const gradient = ctx.createLinearGradient(width / 2 - dx, height / 2 - dy, width / 2 + dx, height / 2 + dy);
  const stops = parts.map((p) => {
    const s = p.trim().match(/^(.*?)(?:\s+(-?\d+(?:\.\d+)?)%)?$/);
    return { color: s[1].trim(), at: s[2] !== undefined ? Number(s[2]) / 100 : undefined };
  });
  if (stops.length && stops[0].at === undefined)
    stops[0].at = 0;
  if (stops.length && stops[stops.length - 1].at === undefined)
    stops[stops.length - 1].at = 1;
  for (let i = 0;i < stops.length; i++) {
    if (stops[i].at !== undefined)
      continue;
    let j = i;
    while (stops[j].at === undefined)
      j++;
    const from = stops[i - 1].at;
    const to = stops[j].at;
    for (let k = i;k < j; k++)
      stops[k].at = from + (to - from) * (k - i + 1) / (j - i + 1);
  }
  let last = 0;
  for (const s of stops) {
    last = Math.min(1, Math.max(last, s.at));
    gradient.addColorStop(last, s.color);
  }
  return gradient;
}
function splitTopLevel(s) {
  const out = [];
  let depth = 0;
  let cur = "";
  for (const ch of s) {
    if (ch === "(")
      depth++;
    if (ch === ")")
      depth--;
    if (ch === "," && depth === 0) {
      out.push(cur);
      cur = "";
    } else
      cur += ch;
  }
  out.push(cur);
  return out;
}
async function renderPreview(cfg, deviceKey, locale) {
  const spec = DEVICES[deviceKey];
  const scene = cfg.scenes.find(isPreview);
  if (!scene)
    return null;
  const manifest = await readManifest(cfg, deviceKey);
  if (!manifest.preview)
    throw new Error("No preview clips in the capture manifest. Run: goldie capture");
  const clips = scene.segments.map((segment) => {
    const clip = manifest.preview.clips.find((c) => c.segmentId === segment.id);
    if (!clip)
      throw new Error(`Segment "${segment.id}" is in the config but not in the capture manifest.`);
    return clip;
  });
  const seconds = clips.reduce((s, c) => s + c.durationSeconds, 0);
  if (seconds < PREVIEW.minSeconds || seconds > PREVIEW.maxSeconds) {
    throw new Error(`Preview is ${seconds.toFixed(1)}s; Apple requires ${PREVIEW.minSeconds}-${PREVIEW.maxSeconds}s. ` + `Adjust the segment flows or their holdSeconds and re-capture.`);
  }
  const outDir = join5(cfg.outDir, "previews", spec.label, locale);
  await mkdir3(outDir, { recursive: true });
  const list = join5(outDir, `.${scene.id}.clips.txt`);
  await writeFile3(list, clips.map((c) => `file '${c.file.replace(/'/g, "'\\''")}'`).join(`
`));
  const final = join5(outDir, `${scene.id}.mp4`);
  const { width, height } = spec.preview;
  const audio = scene.audio ? ["-i", resolve6(cfg.root, scene.audio), "-filter:a", "volume=0.35"] : ["-f", "lavfi", "-i", `anullsrc=r=${PREVIEW.audioSampleRate}:cl=stereo`];
  console.log(`  render preview (${seconds.toFixed(1)}s)`);
  await execOrThrow("ffmpeg", [
    "-y",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    list,
    ...audio,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-vf",
    `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height},fps=${PREVIEW.fps},format=yuv420p`,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-b:v",
    PREVIEW.videoBitrate,
    "-c:a",
    "aac",
    "-b:a",
    PREVIEW.audioBitrate,
    "-ar",
    String(PREVIEW.audioSampleRate),
    "-shortest",
    "-movflags",
    "+faststart",
    final
  ]);
  await rm2(list, { force: true });
  return final;
}
function pick(map, locale, sceneId, field) {
  const value = map[locale];
  if (value === undefined)
    throw new Error(`Scene "${sceneId}" has no ${field} for locale "${locale}".`);
  return value;
}
async function verify(cfg, deviceKey, locale) {
  const spec = DEVICES[deviceKey];
  let ok = true;
  const shotDir = join5(cfg.outDir, "screenshots", spec.label, locale);
  const shots = await exec("sh", ["-c", `ls ${shotDir}/*.png 2>/dev/null`], { quiet: true });
  for (const file of shots.stdout.split(`
`).filter(Boolean)) {
    const r = await execOrThrow("sips", [
      "-g",
      "pixelWidth",
      "-g",
      "pixelHeight",
      "-g",
      "hasAlpha",
      file
    ]);
    const width = Number(r.stdout.match(/pixelWidth:\s*(\d+)/)?.[1]);
    const height = Number(r.stdout.match(/pixelHeight:\s*(\d+)/)?.[1]);
    const alpha = /hasAlpha:\s*yes/.test(r.stdout);
    const alphaOk = !alpha || isTransparent(cfg.theme.background);
    const good = width === spec.screenshot.width && height === spec.screenshot.height && alphaOk;
    ok &&= good;
    console.log(`  ${good ? "ok  " : "FAIL"} ${basename2(file)}  ${width}x${height}` + `${alpha ? alphaOk ? "  transparent (not for upload)" : "  alpha channel present" : ""}` + `${good ? "" : `  expected ${spec.screenshot.width}x${spec.screenshot.height}, no alpha`}`);
  }
  const previewDir = join5(cfg.outDir, "previews", spec.label, locale);
  const videos = await exec("sh", ["-c", `ls ${previewDir}/*.mp4 2>/dev/null`], { quiet: true });
  for (const file of videos.stdout.split(`
`).filter(Boolean)) {
    const r = await execOrThrow("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "stream=codec_type,codec_name,width,height,avg_frame_rate,sample_rate,channels:format=duration",
      "-of",
      "json",
      file
    ]);
    const probe = JSON.parse(r.stdout);
    const video = probe.streams.find((s) => s.codec_type === "video");
    const audio = probe.streams.find((s) => s.codec_type === "audio");
    const duration = Number(probe.format.duration);
    const fps = evalRatio(video?.avg_frame_rate ?? "0/1");
    const bytes = (await stat2(file)).size;
    const checks = [
      [
        "size",
        video?.width === spec.preview.width && video?.height === spec.preview.height,
        `${video?.width}x${video?.height} (need ${spec.preview.width}x${spec.preview.height})`
      ],
      ["codec", video?.codec_name === "h264", String(video?.codec_name)],
      ["fps", fps <= PREVIEW.fps + 0.01, fps.toFixed(2)],
      [
        "duration",
        duration >= PREVIEW.minSeconds && duration <= PREVIEW.maxSeconds,
        `${duration.toFixed(1)}s`
      ],
      [
        "audio",
        Boolean(audio) && audio.codec_name === "aac",
        audio ? `${audio.codec_name} ${audio.sample_rate}Hz` : "none"
      ],
      ["filesize", bytes <= PREVIEW.maxBytes, `${(bytes / 1024 / 1024).toFixed(1)} MB`]
    ];
    for (const [name, good, detail] of checks) {
      ok &&= good;
      console.log(`  ${good ? "ok  " : "FAIL"} ${basename2(file)}  ${name}: ${detail}`);
    }
  }
  return ok;
}
var evalRatio = (r) => {
  const [n, d] = r.split("/").map(Number);
  return d ? n / d : 0;
};
export {
  writeManifest,
  verify,
  resolveScenes,
  repairBrief,
  renderScreenshots,
  renderPreview,
  loadConfig,
  doctor,
  compose,
  capture,
  TEMPLATE_KEYS,
  TEMPLATES,
  PREVIEW,
  LAYOUT_KEYS,
  LAYOUTS,
  FlowFailure,
  DEVICES
};

//# debugId=1E469DD60C32753764756E2164756E21
//# sourceMappingURL=index.js.map

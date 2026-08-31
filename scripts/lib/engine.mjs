// frostie engine — shared core for play-export and the studio.
// Imports the bundled goldie engine (self-installs into ~/.cache/frostie) and adds
// the frostie layer: goldie.design.json merge, the 1080×1920 Play device, feature graphic.

import { execFileSync, execSync } from "node:child_process";
import {
  existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const FONT_FAMILIES = {
  merriweather: '"Merriweather", Georgia, serif',
  "dm-mono": '"DM Mono", ui-monospace, Menlo, monospace',
  lato: '"Lato", system-ui, sans-serif',
  "dm-sans": '"DM Sans", system-ui, sans-serif',
  montserrat: '"Montserrat", system-ui, sans-serif',
};

/** Katalog silnika: vendorowany engine/ z repo frostie, zsynchronizowany do cache
 *  (npm-installing deps happens in the cache, not in the plugin dir). */
export function engineRoot() {
  return join(homedir(), ".cache", "frostie", "engine");
}

export async function loadEngine() {
  const vendored = resolve(dirname(new URL(import.meta.url).pathname), "..", "..", "engine");
  const pkgRoot = engineRoot();
  const verFile = join(pkgRoot, ".vendored-version");
  const wanted = JSON.parse(readFileSync(join(vendored, "package.json"), "utf8")).version;
  const have = existsSync(verFile) ? readFileSync(verFile, "utf8").trim() : "";
  if (have !== wanted || !existsSync(join(pkgRoot, "node_modules"))) {
    mkdirSync(pkgRoot, { recursive: true });
    console.log("[frostie] syncing engine to cache…");
    execSync(`rsync -a --delete --exclude node_modules "${vendored}/" "${pkgRoot}/"`);
    execSync(`npm install --omit=dev --no-audit --no-fund --loglevel=error`, { cwd: pkgRoot, stdio: "inherit" });
    writeFileSync(verFile, wanted);
  }
  const goldie = await import(pathToFileURL(join(pkgRoot, "dist", "index.js")).href);
  const req = createRequire(join(pkgRoot, "package.json"));
  const canvas = req("@napi-rs/canvas");
  // register bundled fonts (dist does not export registerFonts)
  const fontsDir = join(pkgRoot, "assets", "fonts");
  if (existsSync(fontsDir)) {
    for (const f of readdirSync(fontsDir)) {
      if (!f.endsWith(".ttf")) continue;
      const family = f.replace(/-\d+\.ttf$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
      try { canvas.GlobalFonts.registerFromPath(join(fontsDir, f), family); } catch { /* ok */ }
    }
  }
  return { goldie, canvas, pkgRoot };
}

export function designFile(cfgPath) {
  return join(dirname(resolve(cfgPath)), "goldie.design.json");
}

export function readDesign(cfgPath) {
  try { return JSON.parse(readFileSync(designFile(cfgPath), "utf8")); } catch { return {}; }
}

// Odtworzone applyDesign goldie (dist go nie eksportuje) + rozszerzenia frostie
// (goldie ignores the "play" key, so one sidecar serves both stores).
export function applyDesign(cfg, d) {
  if (!d) return;
  if (d.background) {
    cfg.theme.background = d.background;
    for (const sc of cfg.scenes) if (sc.headline) sc.background = undefined;
    cfg.theme.headlineColor = "#FFFFFF";
    cfg.theme.subheadColor = "#D9E1EA";
  }
  if (d.frame) cfg.frame = { variant: d.frame };
  // bundled font key ("lato") → full CSS stack; goldie puts theme.fontFamily
  // straight into ctx.font, so a bare key name = system fallback missing some
  // Polish glyphs (tofu on ą/ń/ś/ę)
  if (d.fontFamily) cfg.theme.fontFamily = FONT_FAMILIES[d.fontFamily] ?? d.fontFamily;
  if (d.template !== undefined) cfg.theme.template = d.template || undefined;
  if (d.layout) cfg.theme.layout = d.layout;
  if (d.screenOnly !== undefined) cfg.theme.screenOnly = d.screenOnly;
  if (d.sceneLayouts) cfg.sceneLayouts = { ...cfg.sceneLayouts, ...d.sceneLayouts };
  if (Array.isArray(d.order) && d.order.length) {
    const shots = cfg.scenes.filter((sc) => sc.headline);
    const others = cfg.scenes.filter((sc) => !sc.headline);
    const pos = new Map(d.order.map((id, i) => [id, i]));
    shots.sort((a, b) => (pos.get(a.id) ?? 999) - (pos.get(b.id) ?? 999));
    cfg.scenes = [...shots, ...others];
  }
  if (d.copy) {
    for (const scene of cfg.scenes) {
      const copy = d.copy[scene.id];
      if (!scene.headline || !copy) continue;
      if (copy.headline) scene.headline = { ...scene.headline, ...copy.headline };
      if (copy.subhead) scene.subhead = { ...scene.subhead, ...copy.subhead };
    }
  }
}

export async function loadProject(env, cfgPath) {
  const cfg = await env.goldie.loadConfig(resolve(cfgPath));
  const design = readDesign(cfgPath);
  applyDesign(cfg, design);
  return { cfg, design, cfgPath: resolve(cfgPath) };
}

const PLAY_KEY = "play-phone";

function ensurePlayDevice(env, cfg) {
  const srcKey = cfg.devices?.[0] ?? "iphone-6.9";
  env.goldie.DEVICES[PLAY_KEY] = {
    ...env.goldie.DEVICES[srcKey],
    label: "play",
    screenshot: { width: 1080, height: 1920 },
    preview: { width: 1080, height: 1920 },
  };
  const rawSrc = join(cfg.outDir, "raw", srcKey);
  const rawPlay = join(cfg.outDir, "raw", PLAY_KEY);
  if (!existsSync(rawSrc)) throw new Error(`no raw captures in ${rawSrc} — run goldie capture first`);
  rmSync(rawPlay, { force: true });
  try { symlinkSync(rawSrc, rawPlay); } catch { /* istnieje */ }
  return { srcKey, rawSrc };
}

/** App Store: te same kafle co goldie frame (bezel wg design.screenOnly/frame). */
export async function renderIOS(env, proj) {
  const srcKey = proj.cfg.devices?.[0] ?? "iphone-6.9";
  for (const locale of proj.cfg.locales ?? ["en-US"]) {
    await env.goldie.renderScreenshots(proj.cfg, srcKey, locale);
  }
}

/** Google Play: 1080×1920, screen-only by default (no Apple hardware). */
export async function renderPlay(env, proj, { bezel = false } = {}) {
  const { rawSrc } = ensurePlayDevice(env, proj.cfg);
  const prevScreenOnly = proj.cfg.theme.screenOnly;
  proj.cfg.theme.screenOnly = !bezel;
  try {
    for (const locale of proj.cfg.locales ?? ["en-US"]) {
      await env.goldie.renderScreenshots(proj.cfg, PLAY_KEY, locale);
    }
  } finally {
    proj.cfg.theme.screenOnly = prevScreenOnly;
  }
  return rawSrc;
}

function parseGradient(ctx, css, w, h) {
  const m = /linear-gradient\(\s*([\d.]+)deg\s*,(.+)\)/.exec(css ?? "");
  if (!m) return css && /^#|^rgb/.test(css.trim()) ? css.trim() : "#101014";
  const angle = ((parseFloat(m[1]) - 90) * Math.PI) / 180;
  const r = Math.hypot(w, h) / 2;
  const cx = w / 2, cy = h / 2;
  const g = ctx.createLinearGradient(
    cx - Math.cos(angle) * r, cy - Math.sin(angle) * r,
    cx + Math.cos(angle) * r, cy + Math.sin(angle) * r,
  );
  const stops = m[2].split(",").map((s) => s.trim()).filter(Boolean);
  stops.forEach((s, i) => {
    const sm = /^(#[0-9a-fA-F]{3,8}|rgba?\([^)]*\))\s*([\d.]+)?%?$/.exec(s);
    if (!sm) return;
    const off = sm[2] !== undefined ? parseFloat(sm[2]) / 100 : i / Math.max(1, stops.length - 1);
    try { g.addColorStop(Math.min(1, Math.max(0, off)), sm[1]); } catch { /* bad color */ }
  });
  return g;
}

function isDark(css) {
  const hex = /#([0-9a-fA-F]{6})/.exec(css ?? "");
  if (!hex) return true;
  const n = parseInt(hex[1], 16);
  const [r, g, b] = [n >> 16, (n >> 8) & 255, n & 255];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b < 140;
}

export function fontStack(cfg) {
  const fam = cfg.theme.fontFamily ?? "sans-serif";
  return FONT_FAMILIES[fam] ?? (/[,"]/.test(fam) ? fam : `"${fam}", sans-serif`);
}

export function pickText(v, locale) {
  return typeof v === "string" ? v : v?.[locale] ?? Object.values(v ?? {})[0] ?? "";
}

/** Feature graphic 1024×500 JPEG (mandatory on Play). */
export async function renderFeatureGraphic(env, proj) {
  const { createCanvas, loadImage } = env.canvas;
  const cfg = proj.cfg;
  const locale = (cfg.locales ?? ["en-US"])[0];
  const srcKey = cfg.devices?.[0] ?? "iphone-6.9";
  const rawSrc = join(cfg.outDir, "raw", srcKey);

  const FG = { width: 1024, height: 500 };
  const canvas = createCanvas(FG.width, FG.height);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = parseGradient(ctx, cfg.theme.background, FG.width, FG.height);
  ctx.fillRect(0, 0, FG.width, FG.height);
  const dark = isDark(cfg.theme.background);
  const fgCol = dark ? "#FFFFFF" : "#111114";
  const fgCol2 = dark ? "rgba(255,255,255,0.72)" : "rgba(17,17,20,0.72)";

  let shotFile = null;
  try {
    const manifest = JSON.parse(readFileSync(join(rawSrc, "manifest.json"), "utf8"));
    shotFile = manifest.screenshots?.[0]?.file ?? null;
  } catch { /* bez zrzutu */ }
  if (shotFile && existsSync(shotFile)) {
    const img = await loadImage(shotFile);
    const shotH = 620;
    const shotW = (img.width / img.height) * shotH;
    // a big one-step downscale (2868→620) blurs text — step down by halves
    let srcC = img, sw = img.width, sh = img.height;
    while (sh / 2 > shotH) {
      const half = createCanvas(Math.round(sw / 2), Math.round(sh / 2));
      const hc = half.getContext("2d");
      hc.imageSmoothingEnabled = true;
      hc.imageSmoothingQuality = "high";
      hc.drawImage(srcC, 0, 0, half.width, half.height);
      srcC = half; sw = half.width; sh = half.height;
    }
    const x = FG.width - shotW - 64, y = 56, r = 34;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 40;
    ctx.beginPath();
    ctx.roundRect(x, y, shotW, shotH, r);
    ctx.clip();
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(srcC, x, y, shotW, shotH);
    ctx.restore();
  }

  const stack = fontStack(cfg);
  const name = pickText(cfg.store?.name, locale) || "App";
  const subtitle = pickText(cfg.store?.subtitle, locale);
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = fgCol;
  ctx.font = `700 84px ${stack}`;
  ctx.fillText(name, 64, 236, 560);
  if (subtitle) {
    ctx.fillStyle = fgCol2;
    ctx.font = `400 40px ${stack}`;
    const words = subtitle.split(" ");
    let line = "";
    const lines = [];
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > 520 && line) { lines.push(line); line = w; }
      else line = t;
    }
    if (line) lines.push(line);
    lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, 64, 308 + i * 54, 560));
  }

  const playDir = join(cfg.outDir, "play");
  mkdirSync(playDir, { recursive: true });
  const fgPath = join(playDir, "feature-graphic.jpg");
  writeFileSync(fgPath, await canvas.encode("jpeg", 95));
  return fgPath;
}

/** Checklista Play do raportu/UI. */
export function playChecklist(cfg) {
  const rows = [];
  for (const locale of cfg.locales ?? ["en-US"]) {
    const dir = join(cfg.outDir, "screenshots", "play", locale);
    const n = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).length : 0;
    rows.push({ locale, count: n, promoEligible: n >= 4, dir });
  }
  return rows;
}

/** Frame variants available in the engine (goldie assets). */
export const FRAME_VARIANTS = ["17-pro-silver", "17-pro-blue", "17-pro-orange"];

function probeImage(file) {
  const out = execFileSync("sips", ["-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", file], { encoding: "utf8" });
  return {
    width: Number(/pixelWidth:\s*(\d+)/.exec(out)?.[1]),
    height: Number(/pixelHeight:\s*(\d+)/.exec(out)?.[1]),
    alpha: /hasAlpha:\s*yes/.test(out),
  };
}

/** Structural verification of Apple + Google Play rules (for the studio panel). */
export function verifyAll(env, proj) {
  const cfg = proj.cfg;
  const rows = [];
  const srcKey = cfg.devices?.[0] ?? "iphone-6.9";
  const spec = env.goldie.DEVICES[srcKey];
  for (const locale of cfg.locales ?? ["en-US"]) {
    const iosDir = join(cfg.outDir, "screenshots", spec.label, locale);
    const iosFiles = existsSync(iosDir) ? readdirSync(iosDir).filter((f) => f.endsWith(".png")) : [];
    rows.push({ store: "App Store", item: `screenshots ${locale}: ${iosFiles.length}`, ok: iosFiles.length >= 1 && iosFiles.length <= 10, detail: "1–10 per device family" });
    for (const f of iosFiles) {
      const m = probeImage(join(iosDir, f));
      const ok = m.width === spec.screenshot.width && m.height === spec.screenshot.height && !m.alpha;
      rows.push({ store: "App Store", item: f, ok, detail: ok ? `${m.width}×${m.height}` : `${m.width}×${m.height}${m.alpha ? " +alfa" : ""}, oczekiwane ${spec.screenshot.width}×${spec.screenshot.height} bez alfy` });
    }
    const playDir = join(cfg.outDir, "screenshots", "play", locale);
    const playFiles = existsSync(playDir) ? readdirSync(playDir).filter((f) => f.endsWith(".png")) : [];
    rows.push({ store: "Google Play", item: `screenshots ${locale}: ${playFiles.length}`, ok: playFiles.length >= 2 && playFiles.length <= 8, detail: "2–8 shots" });
    rows.push({ store: "Google Play", item: `promotion ${locale}`, ok: playFiles.length >= 4, detail: "≥4 shots at ≥1080 px for large promo formats" });
    for (const f of playFiles) {
      const m = probeImage(join(playDir, f));
      const ok = m.width === 1080 && m.height === 1920 && !m.alpha;
      rows.push({ store: "Google Play", item: f, ok, detail: ok ? "1080×1920" : `${m.width}×${m.height}${m.alpha ? " +alfa" : ""}, oczekiwane 1080×1920 bez alfy` });
    }
    const mp4 = join(cfg.outDir, "previews", spec.label, locale, "preview.mp4");
    if (existsSync(mp4)) {
      try {
        const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "json", mp4], { encoding: "utf8" });
        const fmt = JSON.parse(out).format;
        const dur = Number(fmt.duration);
        const okDur = dur >= 15 && dur <= 30;
        rows.push({ store: "App Store", item: `preview.mp4 ${locale}`, ok: okDur, detail: `${dur.toFixed(1)} s (wymagane 15–30 s), ${(Number(fmt.size) / 1e6).toFixed(1)} MB` });
      } catch { rows.push({ store: "App Store", item: `preview.mp4 ${locale}`, ok: false, detail: "ffprobe could not read the file" }); }
    } else {
      rows.push({ store: "App Store", item: `preview.mp4 ${locale}`, ok: false, detail: "missing — run: goldie preview" });
    }
  }
  const fg = join(cfg.outDir, "play", "feature-graphic.jpg");
  if (existsSync(fg)) {
    const m = probeImage(fg);
    const ok = m.width === 1024 && m.height === 500;
    rows.push({ store: "Google Play", item: "feature-graphic.jpg", ok, detail: ok ? "1024×500" : `${m.width}×${m.height}, wymagane 1024×500` });
  } else {
    rows.push({ store: "Google Play", item: "feature-graphic.jpg", ok: false, detail: "missing — mandatory on Play" });
  }
  rows.push({ store: "Google Play", item: "icon 512×512 32-bit PNG", ok: false, detail: "out of frostie scope — prepare separately" });
  rows.push({ store: "Google Play", item: "video", ok: true, detail: "YouTube link only (public/unlisted, ads off) — use preview.mp4" });
  return rows;
}

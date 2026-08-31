// frostie engine — wspólny rdzeń dla play-export i studia.
// Importuje zbundlowany silnik goldie (self-install do ~/.cache/frostie) i dokłada
// warstwę frostie: merge goldie.design.json, urządzenie Play 1080×1920, feature graphic.

import { execSync } from "node:child_process";
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

export async function loadEngine() {
  const PREFIX = join(homedir(), ".cache", "frostie");
  const pkgRoot = join(PREFIX, "node_modules", "goldie");
  if (!existsSync(join(pkgRoot, "dist", "index.js"))) {
    mkdirSync(PREFIX, { recursive: true });
    console.log("[frostie] instaluję goldie do cache…");
    execSync(`npm install --prefix "${PREFIX}" goldie@0 --no-audit --no-fund --loglevel=error`, {
      stdio: "inherit",
    });
  }
  const goldie = await import(pathToFileURL(join(pkgRoot, "dist", "index.js")).href);
  const req = createRequire(join(pkgRoot, "package.json"));
  const canvas = req("@napi-rs/canvas");
  // rejestracja bundlowanych fontów (dist nie eksportuje registerFonts)
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
// (klucz "play" goldie ignoruje, więc jeden sidecar obsługuje oba sklepy).
export function applyDesign(cfg, d) {
  if (!d) return;
  if (d.background) {
    cfg.theme.background = d.background;
    for (const sc of cfg.scenes) if (sc.headline) sc.background = undefined;
    cfg.theme.headlineColor = "#FFFFFF";
    cfg.theme.subheadColor = "#D9E1EA";
  }
  if (d.frame) cfg.frame = { variant: d.frame };
  // klucz bundlowanego fontu ("lato") → pełny stack CSS; goldie wstawia
  // theme.fontFamily wprost do ctx.font, więc goła nazwa klucza = fallback
  // systemowy bez części polskich glyfów (tofu na ą/ń/ś/ę)
  if (d.fontFamily) cfg.theme.fontFamily = FONT_FAMILIES[d.fontFamily] ?? d.fontFamily;
  if (d.template !== undefined) cfg.theme.template = d.template || undefined;
  if (d.layout) cfg.theme.layout = d.layout;
  if (d.screenOnly !== undefined) cfg.theme.screenOnly = d.screenOnly;
  if (d.sceneLayouts) cfg.sceneLayouts = { ...cfg.sceneLayouts, ...d.sceneLayouts };
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
  if (!existsSync(rawSrc)) throw new Error(`brak surowych zrzutów w ${rawSrc} — najpierw: goldie capture`);
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

/** Google Play: 1080×1920, domyślnie screen-only (bez sprzętu Apple). */
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
    try { g.addColorStop(Math.min(1, Math.max(0, off)), sm[1]); } catch { /* zły kolor */ }
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

/** Feature graphic 1024×500 JPEG (obowiązkowy na Play). */
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
    // duży downscale (2868→620) w jednym kroku mydli tekst — schodzimy połówkami
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

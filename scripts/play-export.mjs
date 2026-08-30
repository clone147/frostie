#!/usr/bin/env node
// frostie play-export — zasoby Google Play z istniejącego projektu goldie.
//
// Reużywa silnika goldie (compose/renderScreenshots + goldie.design.json ze studia),
// ale renderuje pod wymogi Google Play (stan: sierpień 2026, Store listing):
//   - screenshoty telefonu: 1080×1920 (9:16 portret) — minimum 2, do 8; do promowania
//     w dużych formatach polecania Play wymaga ≥4 sztuk o boku ≥1080 px,
//   - feature graphic: dokładnie 1024×500, JPEG/24-bit PNG bez alfy — OBOWIĄZKOWY,
//   - domyślnie bez ramki iPhone'a (screen-only z cieniem) — pokazywanie sprzętu Apple
//     na liście Google Play to zła praktyka; flaga --bezel przywraca ramkę.
// Wideo na Play idzie wyłącznie jako link YouTube — użyj gotowego out/previews/**/preview.mp4.
//
// Użycie:  GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts node play-export.mjs [--bezel]
// Wyniki:  out/screenshots/play/<locale>/*.png  +  out/play/feature-graphic.jpg

import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const args = process.argv.slice(2);
const keepBezel = args.includes("--bezel");

// ── goldie z npm (własna kopia w cache — npx nie wystawia importów) ──────────
const PREFIX = join(homedir(), ".cache", "frostie");
const pkgRoot = join(PREFIX, "node_modules", "goldie");
if (!existsSync(join(pkgRoot, "dist", "index.js"))) {
  mkdirSync(PREFIX, { recursive: true });
  console.log("[frostie] instaluję goldie do cache…");
  execSync(`npm install --prefix "${PREFIX}" goldie@0 --no-audit --no-fund --loglevel=error`, {
    stdio: "inherit",
  });
}
const requireFromGoldie = createRequire(join(pkgRoot, "package.json"));
const goldie = await import(pathToFileURL(join(pkgRoot, "dist", "index.js")).href);
const { loadConfig, DEVICES, renderScreenshots } = goldie;
const { createCanvas, loadImage } = requireFromGoldie("@napi-rs/canvas");

// Rodziny fontów bundlowanych z goldie (dist nie eksportuje fontStack)
const FONT_FAMILIES = {
  merriweather: '"Merriweather", Georgia, serif',
  "dm-mono": '"DM Mono", ui-monospace, Menlo, monospace',
  lato: '"Lato", system-ui, sans-serif',
  "dm-sans": '"DM Sans", system-ui, sans-serif',
  montserrat: '"Montserrat", system-ui, sans-serif',
};

// ── config + design sidecar (odtworzone applyDesign — dist go nie eksportuje) ─
const cfgPath = process.env.GOLDIE_CONFIG ? resolve(process.env.GOLDIE_CONFIG) : undefined;
const cfg = await loadConfig(cfgPath);
try {
  const designFile = join(
    cfgPath ? resolve(cfgPath, "..") : process.cwd(),
    "goldie.design.json",
  );
  if (existsSync(designFile)) {
    const d = JSON.parse(readFileSync(designFile, "utf8"));
    if (d.background) {
      cfg.theme.background = d.background;
      for (const sc of cfg.scenes) if (sc.headline) sc.background = undefined;
      cfg.theme.headlineColor = "#FFFFFF";
      cfg.theme.subheadColor = "#D9E1EA";
    }
    if (d.fontFamily) cfg.theme.fontFamily = d.fontFamily;
    if (d.template !== undefined) cfg.theme.template = d.template || undefined;
    if (d.layout) cfg.theme.layout = d.layout;
    if (d.sceneLayouts) cfg.sceneLayouts = { ...cfg.sceneLayouts, ...d.sceneLayouts };
  }
} catch (e) {
  console.warn(`[frostie] pomijam goldie.design.json: ${e.message}`);
}
cfg.theme.screenOnly = !keepBezel;

// ── urządzenie "play": kanwa 1080×1920 (9:16), raw z pierwszego urządzenia iOS ─
const srcKey = cfg.devices?.[0] ?? "iphone-6.9";
const PLAY_KEY = "play-phone";
DEVICES[PLAY_KEY] = {
  ...DEVICES[srcKey],
  label: "play",
  screenshot: { width: 1080, height: 1920 },
  preview: { width: 1080, height: 1920 },
};
const rawSrc = join(cfg.outDir, "raw", srcKey);
const rawPlay = join(cfg.outDir, "raw", PLAY_KEY);
if (!existsSync(rawSrc)) {
  console.error(`[frostie] brak surowych zrzutów w ${rawSrc} — najpierw: goldie capture`);
  process.exit(1);
}
rmSync(rawPlay, { force: true });
try { symlinkSync(rawSrc, rawPlay); } catch { /* istnieje */ }

const locales = cfg.locales ?? ["en-US"];

// ── feature graphic 1024×500 (obowiązkowy na Play) ───────────────────────────
// Tło i typografia z motywu goldie; po prawej pierwszy surowy zrzut w zaokrąglonym
// oknie wystającym poza dolną krawędź. JPEG — Play nie przyjmuje PNG z alfą.
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

// rejestracja bundlowanych fontów wprost (nie polegamy na wewnętrznym registerFonts)
const { GlobalFonts } = requireFromGoldie("@napi-rs/canvas");
const fontsDir = join(pkgRoot, "assets", "fonts");
if (existsSync(fontsDir)) {
  for (const f of readdirSync(fontsDir)) {
    if (!f.endsWith(".ttf")) continue;
    const family = f.replace(/-\d+\.ttf$/, "").replace(/([a-z])([A-Z])/g, "$1 $2");
    try { GlobalFonts.registerFromPath(join(fontsDir, f), family); } catch { /* ok */ }
  }
}
const fam = cfg.theme.fontFamily ?? "sans-serif";
// fontFamily bywa kluczem bundlowanego fontu ("montserrat") albo gotowym stackiem CSS
const stack = FONT_FAMILIES[fam] ?? (/[,"]/.test(fam) ? fam : `"${fam}", sans-serif`);
const FG = { width: 1024, height: 500 };
const canvas = createCanvas(FG.width, FG.height);
const ctx = canvas.getContext("2d");
ctx.fillStyle = parseGradient(ctx, cfg.theme.background, FG.width, FG.height);
ctx.fillRect(0, 0, FG.width, FG.height);
const dark = isDark(cfg.theme.background);
const fgCol = dark ? "#FFFFFF" : "#111114";
const fgCol2 = dark ? "rgba(255,255,255,0.72)" : "rgba(17,17,20,0.72)";

// zrzut po prawej
let shotFile = null;
try {
  const manifest = JSON.parse(readFileSync(join(rawSrc, "manifest.json"), "utf8"));
  shotFile = manifest.screenshots?.[0]?.file ?? null;
} catch { /* bez zrzutu */ }
if (shotFile && existsSync(shotFile)) {
  const img = await loadImage(shotFile);
  const shotH = 620;
  const shotW = (img.width / img.height) * shotH;
  const x = FG.width - shotW - 64, y = 56, r = 34;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 40;
  ctx.beginPath();
  ctx.roundRect(x, y, shotW, shotH, r);
  ctx.clip();
  ctx.drawImage(img, x, y, shotW, shotH);
  ctx.restore();
}

// nazwa + podtytuł z manifestu store (pola bywają rekordami per-locale)
const loc = locales[0];
const pickText = (v) => typeof v === "string" ? v : v?.[loc] ?? Object.values(v ?? {})[0] ?? "";
const name = pickText(cfg.store?.name) || "App";
const subtitle = pickText(cfg.store?.subtitle);
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
writeFileSync(fgPath, await canvas.encode("jpeg", 92));

// ── screenshoty ──────────────────────────────────────────────────────────────
for (const locale of locales) {
  console.log(`[frostie] screenshoty Play ${locale} (1080×1920${keepBezel ? ", z ramką" : ", screen-only"})`);
  await renderScreenshots(cfg, PLAY_KEY, locale);
}

// ── raport / checklista Play ─────────────────────────────────────────────────
console.log("\n[frostie] gotowe. Checklista Google Play:");
for (const locale of locales) {
  const dir = join(cfg.outDir, "screenshots", "play", locale);
  const n = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).length : 0;
  const promo = n >= 4
    ? "OK (≥4 → kwalifikują się do dużych formatów polecania)"
    : "UWAGA: <4 — Play nie użyje appki w dużych formatach polecania";
  console.log(`  • screenshoty ${locale}: ${n} szt. 1080×1920 → ${dir} — ${promo}`);
}
console.log(`  • feature graphic 1024×500 (wymagany): ${fgPath}`);
console.log("  • ikona 512×512 32-bit PNG — przygotuj osobno (frostie jej nie generuje)");
console.log("  • wideo: Play przyjmuje TYLKO link YouTube — wrzuć out/previews/**/preview.mp4 na YT (public/unlisted, bez reklam)");

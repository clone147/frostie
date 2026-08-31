#!/usr/bin/env node
// frostie studio — jedno studio dla obu sklepów: App Store i Google Play.
// Edycja designu (tło, font, template, layout, bezel, nagłówki) zapisuje się do
// goldie.design.json (ten sam sidecar, który czyta goldie) i re-renderuje OBA
// zestawy przez silnik frostie — WYSIWYG po stronie serwera, bez npx.
//
// Użycie:  GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts node studio.mjs [--port 4322]

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import {
  designFile, FONT_FAMILIES, loadEngine, loadProject, pickText, playChecklist,
  renderFeatureGraphic, renderIOS, renderPlay,
} from "./lib/engine.mjs";

const cfgPath = process.env.GOLDIE_CONFIG;
if (!cfgPath) {
  console.error("[frostie] ustaw GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts");
  process.exit(1);
}
const portIdx = process.argv.indexOf("--port");
const PORT = portIdx > 0 ? Number(process.argv[portIdx + 1]) : 4322;

const env = await loadEngine();
let proj = await loadProject(env, cfgPath);
const HERE = dirname(fileURLToPath(import.meta.url));

const MIME = {
  ".html": "text/html; charset=utf-8", ".png": "image/png", ".jpg": "image/jpeg",
  ".json": "application/json", ".mp4": "video/mp4",
};

function json(res, body, status = 200) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

function state() {
  const cfg = proj.cfg;
  const locale = (cfg.locales ?? ["en-US"])[0];
  const srcLabel = env.goldie.DEVICES[cfg.devices?.[0] ?? "iphone-6.9"].label;
  const list = (dir) =>
    existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".png")).sort() : [];
  const iosDir = join(cfg.outDir, "screenshots", srcLabel, locale);
  const playDir = join(cfg.outDir, "screenshots", "play", locale);
  return {
    locale,
    store: {
      name: pickText(cfg.store?.name, locale),
      subtitle: pickText(cfg.store?.subtitle, locale),
      developer: cfg.store?.developer ?? "",
      category: pickText(cfg.store?.category, locale),
      rating: cfg.store?.rating ?? "",
      ratingCount: pickText(cfg.store?.ratingCount, locale),
      price: pickText(cfg.store?.price, locale),
      description: pickText(cfg.store?.description, locale),
    },
    design: {
      background: proj.cfg.theme.background,
      fontFamily: (() => {
        const f = proj.design.fontFamily ?? "";
        if (FONT_FAMILIES[f]) return f;
        const key = Object.entries(FONT_FAMILIES).find(([, v]) => v === f)?.[0];
        return key ?? f;
      })(),
      template: proj.design.template ?? proj.cfg.theme.template ?? "",
      layout: proj.design.layout ?? "",
      screenOnly: proj.cfg.theme.screenOnly === true,
      playBezel: proj.design.play?.bezel === true,
    },
    scenes: proj.cfg.scenes
      .filter((s) => s.headline)
      .map((s) => ({
        id: s.id,
        headline: pickText(s.headline, locale),
        subhead: s.subhead ? pickText(s.subhead, locale) : "",
      })),
    templates: env.goldie.TEMPLATE_KEYS,
    layouts: env.goldie.LAYOUT_KEYS,
    fonts: ["", "montserrat", "lato", "dm-sans", "dm-mono", "merriweather"],
    ios: list(iosDir).map((f) => `/shots/ios/${f}`),
    play: list(playDir).map((f) => `/shots/play/${f}`),
    fg: existsSync(join(cfg.outDir, "play", "feature-graphic.jpg")) ? "/fg" : null,
    checklist: playChecklist(cfg),
  };
}

async function applyAndRender(body) {
  // merge do istniejącego sidecara — pola goldie zostają nienaruszone
  const file = designFile(cfgPath);
  let d = {};
  try { d = JSON.parse(readFileSync(file, "utf8")); } catch { /* nowy */ }
  if (body.background !== undefined) d.background = body.background || undefined;
  if (body.fontFamily !== undefined) d.fontFamily = body.fontFamily || undefined;
  if (body.template !== undefined) d.template = body.template ?? "";
  if (body.layout !== undefined) d.layout = body.layout || undefined;
  if (body.screenOnly !== undefined) d.screenOnly = !!body.screenOnly;
  d.play = { ...d.play, bezel: !!body.playBezel };
  if (body.copy) {
    d.copy = d.copy ?? {};
    const locale = (proj.cfg.locales ?? ["en-US"])[0];
    for (const [sceneId, c] of Object.entries(body.copy)) {
      d.copy[sceneId] = d.copy[sceneId] ?? {};
      if (c.headline !== undefined)
        d.copy[sceneId].headline = { ...d.copy[sceneId].headline, [locale]: c.headline };
      if (c.subhead !== undefined)
        d.copy[sceneId].subhead = { ...d.copy[sceneId].subhead, [locale]: c.subhead };
    }
  }
  writeFileSync(file, JSON.stringify(d, null, 2));

  proj = await loadProject(env, cfgPath); // świeży cfg z nowym designem
  await renderIOS(env, proj);
  await renderPlay(env, proj, { bezel: d.play.bezel });
  await renderFeatureGraphic(env, proj);
}

let rendering = false;
const server = createServer(async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/") {
      res.writeHead(200, { "Content-Type": MIME[".html"] });
      res.end(readFileSync(join(HERE, "studio.html")));
      return;
    }
    if (url.pathname === "/api/state") return json(res, state());
    if (url.pathname === "/api/apply" && req.method === "POST") {
      if (rendering) return json(res, { error: "render w toku" }, 409);
      rendering = true;
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", async () => {
        try {
          await applyAndRender(JSON.parse(raw || "{}"));
          json(res, { ok: true, state: state() });
        } catch (e) {
          json(res, { error: String(e.message ?? e) }, 500);
        } finally {
          rendering = false;
        }
      });
      return;
    }
    // pliki wynikowe
    const cfg = proj.cfg;
    const locale = (cfg.locales ?? ["en-US"])[0];
    const srcLabel = env.goldie.DEVICES[cfg.devices?.[0] ?? "iphone-6.9"].label;
    let file = null;
    if (url.pathname.startsWith("/shots/ios/"))
      file = join(cfg.outDir, "screenshots", srcLabel, locale, normalize(url.pathname.slice(11)));
    else if (url.pathname.startsWith("/shots/play/"))
      file = join(cfg.outDir, "screenshots", "play", locale, normalize(url.pathname.slice(12)));
    else if (url.pathname === "/fg") file = join(cfg.outDir, "play", "feature-graphic.jpg");
    if (file && !file.includes("..") && existsSync(file)) {
      res.writeHead(200, {
        "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(readFileSync(file));
      return;
    }
    res.writeHead(404); res.end("not found");
  } catch (e) {
    json(res, { error: String(e.message ?? e) }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`[frostie] studio: http://localhost:${PORT}`);
});

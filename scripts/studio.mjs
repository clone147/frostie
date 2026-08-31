#!/usr/bin/env node
// frostie studio — one studio for both stores: App Store and Google Play.
// Design edits (background, font, template, layout, bezel, headlines) are saved to
// goldie.design.json (the same sidecar goldie reads) and re-render BOTH asset sets
// through the frostie engine — server-side WYSIWYG, no npx.
//
// Usage:  GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts node studio.mjs [--port 4322]

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import {
  designFile, FONT_FAMILIES, FRAME_VARIANTS, loadEngine, loadProject, pickText, playChecklist,
  renderFeatureGraphic, renderIOS, renderPlay, verifyAll,
} from "./lib/engine.mjs";

const cfgPath = process.env.GOLDIE_CONFIG;
if (!cfgPath) {
  console.error("[frostie] set GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts");
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
      frame: proj.design.frame ?? proj.cfg.frame?.variant ?? "",
    },
    frames: FRAME_VARIANTS,
    scenes: proj.cfg.scenes
      .filter((s) => s.headline)
      .map((s) => ({
        id: s.id,
        headline: pickText(s.headline, locale),
        subhead: s.subhead ? pickText(s.subhead, locale) : "",
        layout: proj.cfg.sceneLayouts?.[s.id] ?? "",
      })),
    templates: env.goldie.TEMPLATE_KEYS,
    layouts: env.goldie.LAYOUT_KEYS,
    fonts: ["", "montserrat", "lato", "dm-sans", "dm-mono", "merriweather"],
    ios: list(iosDir).map((f) => `/shots/ios/${f}`),
    play: list(playDir).map((f) => `/shots/play/${f}`),
    fg: existsSync(join(cfg.outDir, "play", "feature-graphic.jpg")) ? "/fg" : null,
    preview: existsSync(join(cfg.outDir, "previews", srcLabel, locale, "preview.mp4")) ? "/preview.mp4" : null,
    checklist: playChecklist(cfg),
    verify: verifyAll(env, proj),
  };
}

async function applyAndRender(body) {
  // merge into the existing sidecar — goldie-owned fields stay untouched
  const file = designFile(cfgPath);
  let d = {};
  try { d = JSON.parse(readFileSync(file, "utf8")); } catch { /* nowy */ }
  if (body.background !== undefined) d.background = body.background || undefined;
  if (body.fontFamily !== undefined) d.fontFamily = body.fontFamily || undefined;
  if (body.template !== undefined) d.template = body.template ?? "";
  if (body.layout !== undefined) d.layout = body.layout || undefined;
  if (body.screenOnly !== undefined) d.screenOnly = !!body.screenOnly;
  if (body.frame !== undefined) d.frame = body.frame || undefined;
  if (Array.isArray(body.order)) d.order = body.order;
  if (body.sceneLayouts) {
    d.sceneLayouts = { ...d.sceneLayouts };
    for (const [id, l] of Object.entries(body.sceneLayouts)) {
      if (l) d.sceneLayouts[id] = l; else delete d.sceneLayouts[id];
    }
    if (!Object.keys(d.sceneLayouts).length) delete d.sceneLayouts;
  }
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

  proj = await loadProject(env, cfgPath); // fresh cfg with the new design
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
    // output files
    const cfg = proj.cfg;
    const locale = (cfg.locales ?? ["en-US"])[0];
    const srcLabel = env.goldie.DEVICES[cfg.devices?.[0] ?? "iphone-6.9"].label;
    let file = null;
    if (url.pathname.startsWith("/shots/ios/"))
      file = join(cfg.outDir, "screenshots", srcLabel, locale, normalize(url.pathname.slice(11)));
    else if (url.pathname.startsWith("/shots/play/"))
      file = join(cfg.outDir, "screenshots", "play", locale, normalize(url.pathname.slice(12)));
    else if (url.pathname === "/fg") file = join(cfg.outDir, "play", "feature-graphic.jpg");
    else if (url.pathname === "/preview.mp4") file = join(cfg.outDir, "previews", srcLabel, locale, "preview.mp4");
    else if (url.pathname === "/api/export") {
      const zipPath = join(cfg.outDir, "frostie-export.zip");
      try {
        execFileSync("rm", ["-f", zipPath]);
        const parts = ["screenshots", "play", "previews"].filter((d2) => existsSync(join(cfg.outDir, d2)));
        execFileSync("zip", ["-r", "-q", zipPath, ...parts], { cwd: cfg.outDir });
        res.writeHead(200, {
          "Content-Type": "application/zip",
          "Content-Disposition": 'attachment; filename="frostie-export.zip"',
        });
        res.end(readFileSync(zipPath));
      } catch (e) {
        json(res, { error: String(e.message ?? e) }, 500);
      }
      return;
    }
    if (file && !file.includes("..") && existsSync(file)) {
      const buf = readFileSync(file);
      const type = MIME[extname(file)] ?? "application/octet-stream";
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
      if (range && (range[1] || range[2])) {
        const start = range[1] ? Number(range[1]) : Math.max(0, buf.length - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), buf.length - 1) : buf.length - 1;
        res.writeHead(206, {
          "Content-Type": type,
          "Content-Range": `bytes ${start}-${end}/${buf.length}`,
          "Content-Length": end - start + 1,
          "Accept-Ranges": "bytes",
          "Cache-Control": "no-store",
        });
        res.end(buf.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, {
        "Content-Type": type,
        "Content-Length": buf.length,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-store",
      });
      res.end(buf);
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

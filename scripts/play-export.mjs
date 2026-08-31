#!/usr/bin/env node
// frostie play-export — Google Play assets from an existing goldie project (CLI).
// Engine shared with the frostie studio: scripts/lib/engine.mjs.
//
// Usage:  GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts node play-export.mjs [--bezel]
// Wyniki:  out/screenshots/play/<locale>/*.png  +  out/play/feature-graphic.jpg

import {
  loadEngine, loadProject, playChecklist, renderFeatureGraphic, renderPlay,
} from "./lib/engine.mjs";

const keepBezel = process.argv.includes("--bezel");
const cfgPath = process.env.GOLDIE_CONFIG;
if (!cfgPath) {
  console.error("[frostie] ustaw GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts");
  process.exit(1);
}

const env = await loadEngine();
const proj = await loadProject(env, cfgPath);
const bezel = keepBezel || proj.design?.play?.bezel === true;

const fgPath = await renderFeatureGraphic(env, proj);
console.log(`[frostie] Play screenshots (1080×1920${bezel ? ", with bezel" : ", screen-only"})`);
await renderPlay(env, proj, { bezel });

console.log("\n[frostie] done. Google Play checklist:");
for (const row of playChecklist(proj.cfg)) {
  const promo = row.promoEligible
    ? "OK (≥4 → eligible for large promo formats)"
    : "WARNING: <4 — Play will not use the app in large promo formats";
  console.log(`  • screenshots ${row.locale}: ${row.count} × 1080×1920 → ${row.dir} — ${promo}`);
}
console.log(`  • feature graphic 1024×500 (mandatory): ${fgPath}`);
console.log("  • icon 512×512 32-bit PNG — prepare separately (frostie does not generate it)");
console.log("  • video: Play accepts ONLY a YouTube link — upload out/previews/**/preview.mp4 to YT (public/unlisted, ads off)");

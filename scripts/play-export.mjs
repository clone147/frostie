#!/usr/bin/env node
// frostie play-export — zasoby Google Play z istniejącego projektu goldie (CLI).
// Silnik współdzielony ze studiem frostie: scripts/lib/engine.mjs.
//
// Użycie:  GOLDIE_CONFIG=<repo>/goldie/goldie.config.ts node play-export.mjs [--bezel]
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
console.log(`[frostie] screenshoty Play (1080×1920${bezel ? ", z ramką" : ", screen-only"})`);
await renderPlay(env, proj, { bezel });

console.log("\n[frostie] gotowe. Checklista Google Play:");
for (const row of playChecklist(proj.cfg)) {
  const promo = row.promoEligible
    ? "OK (≥4 → kwalifikują się do dużych formatów polecania)"
    : "UWAGA: <4 — Play nie użyje appki w dużych formatach polecania";
  console.log(`  • screenshoty ${row.locale}: ${row.count} szt. 1080×1920 → ${row.dir} — ${promo}`);
}
console.log(`  • feature graphic 1024×500 (wymagany): ${fgPath}`);
console.log("  • ikona 512×512 32-bit PNG — przygotuj osobno (frostie jej nie generuje)");
console.log("  • wideo: Play przyjmuje TYLKO link YouTube — wrzuć out/previews/**/preview.mp4 na YT (public/unlisted, bez reklam)");

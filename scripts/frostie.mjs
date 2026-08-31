#!/usr/bin/env node
// frostie CLI — doctor / capture / frame / preview / manifest / verify / help.
// Runs the vendored engine (engine/dist/cli.js) — no dependency on npm goldie.
import { spawnSync, execFileSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";
import { engineRoot, loadEngine, loadProject } from "./lib/engine.mjs";

const env = await loadEngine(); // syncs the engine + installs deps on first use

// Preview segment with trimStartSeconds: cut the head of the raw recording BEFORE
// the engine joins the clips (e.g. launching a web clip via Spotlight must not end
// up in the App Store video). Idempotent: the original lands in
// preview-<id>.orig.mp4 and every trim starts from that original.
if (process.argv[2] === "preview" && process.env.GOLDIE_CONFIG) {
  const { cfg } = await loadProject(env, process.env.GOLDIE_CONFIG);
  const srcKey = cfg.devices?.[0] ?? "iphone-6.9";
  for (const scene of cfg.scenes ?? []) {
    if (scene.kind !== "preview") continue;
    for (const seg of scene.segments ?? []) {
      const trim = Number(seg.trimStartSeconds ?? 0);
      if (!(trim > 0)) continue;
      const raw = join(cfg.outDir, "raw", srcKey, `preview-${seg.id}.mp4`);
      const orig = join(cfg.outDir, "raw", srcKey, `preview-${seg.id}.orig.mp4`);
      if (!existsSync(orig)) {
        if (!existsSync(raw)) continue;
        renameSync(raw, orig);
      }
      console.log(`  trim preview-${seg.id}: -${trim}s`);
      execFileSync("ffmpeg", ["-y", "-v", "error", "-ss", String(trim), "-i", orig,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", raw]);
    }
  }
}
const r = spawnSync(process.execPath, [join(engineRoot(), "dist", "cli.js"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);

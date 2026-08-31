#!/usr/bin/env node
// frostie CLI — doctor / capture / frame / preview / manifest / verify / help.
// Uruchamia vendorowany silnik (engine/dist/cli.js) — zero zależności od npm goldie.
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { engineRoot, loadEngine } from "./lib/engine.mjs";

await loadEngine(); // synchronizacja silnika + instalacja zależności przy pierwszym użyciu
const r = spawnSync(process.execPath, [join(engineRoot(), "dist", "cli.js"), ...process.argv.slice(2)], {
  stdio: "inherit",
  env: process.env,
});
process.exit(r.status ?? 1);

# frostie — full absorption of goldie (goal checklist)

Rule: a box gets checked only after the item has been TESTED.

## Self-containment (no goldie plugin on the system)
- [x] 1. frostie as a plugin: `.claude-plugin/plugin.json` + `marketplace.json`
- [x] 2. Own `.mcp.json` bundling the argent server (as in goldie)
- [x] 3. SKILL.md: the WHOLE iOS workflow absorbed (Stage 1 without delegating to the goldie skill)
- [x] 4. `references/config.md` (config schema + copywriting) in the frostie repo
- [x] 5. `references/flows.md` (flow YAML vocabulary) in the frostie repo
- [x] 6. References like "fall back to goldie's studio" removed from SKILL.md
- [x] 7. doctor/capture/frame/preview/manifest/verify documented as frostie commands
       (engine: pinned npm package goldie@0 — kept as a library)

## Studio parity (goldie studio features in the frostie studio)
- [x] 8. Tile reorder saved to design.order
- [x] 9. Per-scene layout override (design.sceneLayouts) in the UI
- [x] 10. Frame variant picker (17-pro-silver/blue/orange) in the UI
- [x] 11. Preview video playback in the studio (when out/previews/** exists)
- [x] 12. Apple + Play rules verification panel (verify) in the studio
- [x] 13. Upload-ready ZIP export (App Store + Play in one archive)

## Release
- [x] 14. Final tests: full pass on the mijagi project (studio + export)
- [x] 15. Push to GitHub (clone147/frostie) with short docs (README updated)
- [x] 16. frostie entry in the open-source section on szron.tech + site deploy

## 0.4.0 — zero dependency on npm goldie (request: "everything inside frostie")
- [x] 17. Engine vendored into engine/ (dist+assets+studio, LICENSE+NOTICE, MIT)
- [x] 18. scripts/frostie.mjs — own CLI (doctor/capture/frame/preview/manifest/verify)
- [x] 19. engine.mjs loads the engine from engine/ (sync to ~/.cache/frostie/engine + npm i runtime deps)
- [x] 20. Tests on a clean cache: help, frame, play-export, studio apply+verify — all passed
- [x] 21. SKILL.md and README without npx goldie commands (only config file names kept for compatibility)

## 0.4.1 — i18n
- [x] 22. English as the default language of the CLI, studio UI and docs
- [x] 23. Polish README (README.pl.md)

## 0.5.0 — studio redesign
- [x] 24. Editor-style studio UI: top bar with store switch + live status, canvas with real store mockups,
       3-tab inspector (Design / Copy / Checks), tile ⇄ headline selection, deep links (?store, ?pane, ?sel)

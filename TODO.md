# frostie — pełne wchłonięcie goldie (checklista celu)

Zasada: odhaczam dopiero po PRZETESTOWANIU danego punktu.

## Samodzielność (bez pluginu goldie w systemie)
- [x] 1. Frostie jako plugin: `.claude-plugin/plugin.json` + `marketplace.json`
- [x] 2. Własny `.mcp.json` bundlujący serwer argent (jak w goldie)
- [x] 3. SKILL.md: wchłonięty CAŁY workflow iOS (Etap 1 bez delegacji do skilla goldie)
- [x] 4. `references/config.md` (schemat configu + copywriting) w repo frostie
- [x] 5. `references/flows.md` (słownik flow YAML) w repo frostie
- [x] 6. Usunięte odwołania „fall back to goldie's studio" itp. ze SKILL.md
- [x] 7. doctor/capture/frame/preview/manifest/verify udokumentowane jako komendy frostie
       (silnik: pinowany pakiet npm goldie@0 — zostaje jako biblioteka)

## Parytet studia (funkcje studia goldie w studiu frostie)
- [x] 8. Zmiana kolejności kafli (reorder) zapisywana do design.order
- [x] 9. Per-scene layout override (design.sceneLayouts) w UI
- [x] 10. Wybór wariantu ramki (17-pro-silver/blue/orange) w UI
- [x] 11. Podgląd wideo preview w studiu (gdy out/previews/** istnieje)
- [x] 12. Panel weryfikacji reguł Apple + Play (verify) w studiu
- [x] 13. Eksport ZIP gotowy do uploadu (App Store + Play w jednym archiwum)

## Publikacja
- [x] 14. Testy końcowe: pełny przebieg na projekcie mijagi (studio + eksport)
- [x] 15. Push na GitHub (clone147/frostie) z krótką dokumentacją (README zaktualizowany)
- [ ] 16. Wpis frostie w strefie opensource na szron.tech + deploy strony

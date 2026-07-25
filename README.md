# Snootventure — Ebenen-Prototyp „Mensch & Hund"

2D-Puzzle-Platformer-Prototyp (Phaser 4 + TypeScript strict + Vite + Arcade
Physics). Dieser Prototyp baut das **Ebenensystem** (Diorama-Layer), das
**Player-Movement** und die **Kamera** — Architektur ausgelegt auf später zwei
Entities (Mensch + Hund) auf verschiedenen Ebenen.

## Entwicklung

```bash
npm ci
npm run dev        # lokaler Dev-Server
npm run typecheck  # tsc strict
npm run test       # vitest (pure Logik: movement, ab M2 LayerManager)
npm run build      # Produktions-Build nach dist/
```

## Steuerung

| Aktion                  | Tastatur     | Touch (Handy) |
| ----------------------- | ------------ | ------------- |
| Laufen                  | A/D bzw. ←/→ | ◀ / ▶ Buttons |
| Springen (variabel)     | Space        | ▲ Button      |
| Ebene nach hinten       | W bzw. ↑     | ⇧ Button      |
| Ebene nach vorn         | S bzw. ↓     | ⇩ Button      |

Ebenenwechsel geht nur in den sichtbaren ⇅-Zonen (auch in der Luft). Die
kanonische Position bleibt erhalten — hat die Zielebene dort keine Plattform,
fällt man (auf Ebene 1 gibt es dafür eine Bodenlücke bei x 1000–1300).

Space kürzer halten = niedrigerer Sprung. Coyote Time (~100 ms) und Jump
Buffering (~120 ms) sind aktiv; Werte in `src/config/GameConfig.ts`.

## GitHub Pages — pro Branch anspielbar

Jeder Push baut den Branch und deployt ihn nach
`gh-pages/<branchname>/`. URL-Schema:

```
https://flip012.github.io/snootventure/<branchname>/
```

Aktueller Test-Branch:
**<https://flip012.github.io/snootventure/claude/mensch-hund-layers-prototype-rsdxby/>**

Die Root-URL <https://flip012.github.io/snootventure/> listet alle deployten
Branches.

### Einmalige Aktivierung (manuell, nur beim ersten Mal)

1. Repo → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: **gh-pages**, Ordner **/(root)** → Save

Danach deployt jeder Push automatisch (Workflow:
`.github/workflows/deploy.yml`). Hinweis: `keep_files: true` lässt alte
Build-Hashes im Branch-Ordner liegen — für den Prototyp unkritisch.

## Grafik — Noir-Look

Komplett Schwarz-Weiß/Graustufen: dunkle Welt, Hängelampen (teils schwingend)
stanzen Lichtkegel aus einer Dunkelheits-Maske, der Spieler ist eine schwarze
Silhouette und wirft unter Lampen einen wandernden Schatten. Im Dunkeln sind
**nur seine Augen sichtbar**. Tuning in `GameConfig.lighting`
(`overlayAlpha`, `glowAlpha`, `depthDimming`, `shadowMaxAlpha`, …); Lampen
sind Level-Daten in `src/config/testLevel.ts`.

Alle Texturen werden zur Laufzeit generiert. Drop-in-Slot für echte Assets
(z. B. [Kenney CC0](https://kenney.nl/assets)): in
`src/scenes/BootScene.ts` die `generate*`-Aufrufe durch `this.load.image(...)`
mit denselben Textur-Keys (`player`, `block`, `eyes`, `light`, `shadow`)
ersetzen.

## Architektur

Siehe `CLAUDE.md` für die zentralen Entscheidungen (Physik/Präsentation-Split,
Transition-Verhalten, dokumentierte Edge-Cases).

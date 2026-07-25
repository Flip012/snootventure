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

| Aktion              | Tastatur     | Touch (Handy) |
| ------------------- | ------------ | ------------- |
| Laufen              | A/D bzw. ←/→ | ◀ / ▶ Buttons |
| Springen (variabel) | Space        | ▲ Button      |
| Ebene nach hinten ▲ | W bzw. ↑     | ⇧ Button      |
| Ebene nach vorn ▼   | S bzw. ↓     | ⇩ Button      |
| Debug-Overlay       | F1           | —             |

Ebenenwechsel geht nur in den markierten Zonen (auch in der Luft). Jede Zone
zeigt an, wohin es von dort aus geht: **▲ W hinten** und/oder **▼ S vorn**. Die
kanonische Position bleibt erhalten — hat die Zielebene dort keine Plattform,
fällt man (auf Ebene 2 gibt es dafür eine Bodenlücke bei x 1000–1300).

## Ziel und Route

Start links auf Ebene 1, Ziel oben rechts auf Ebene 2. Der Weg führt zwingend
über die hinterste Ebene:

1. Bodenlücke bei x 420 überspringen
2. Zone B (x 840, verbindet alle drei Ebenen) → zweimal ▲ auf Ebene 3
3. Lücke bei x 1250 überspringen, weiter nach rechts
4. Treppe ab x 1900 in drei Sprüngen hoch
5. Zone D (x 2280, nur Ebene 2↔3) → ▼ auf Ebene 2 → Ziel

## Mensch und Hund

Der Hund hängt an einer Leine (Federphysik) und hat einen eigenen Kopf. Zieht
er, wirst du mitgezogen — stemmst du dich dagegen, kommst du langsamer voran.
Springen kann er wie ein echter Hund nur minimal; Treppen schafft er nicht
allein, du musst ihn an der Leine hochziehen.

Was er von sich aus macht:

- **Schnüffeln und markieren** an Büschen, Sträuchern, Grasbüscheln und
  Pollern. Sein Interesse fällt **quadratisch mit dem Abstand** — gehst du
  einfach weiter, gibt er die Stelle schnell auf und trabt mit. Frisch
  besuchte Stellen sind eine Weile langweilig.
- **Von selbst zurückkommen:** Je weiter er weg ist, desto wahrscheinlicher
  besinnt er sich und läuft zu dir — die Leine reißt ihn nicht abrupt zurück.
- **Vorweg traben**, wenn du zügig gehst.
- **Schütteln**, **Hinsetzen** (wenn du länger stehen bleibst) und
  gelegentliche **Zoomies** — kurze Übermuts-Sprints mit Hüpfern.

Das Debug-Overlay (F1) zeigt seine aktuelle Laune und das Interesse an der
angesteuerten Stelle.

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

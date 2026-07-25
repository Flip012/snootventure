# Snootventure — Layer Prototype

Ein spielbarer Prototyp für ein 2D-Puzzle-Platformer-Konzept mit **mehreren
spielbaren Tiefenebenen** (Diorama-Look, Wechselpunkte à la Mutant Mudds /
Kirby Triple Deluxe). Dieser Stand fokussiert **Ebenensystem, Player-Movement
und Kamera** — kein Hund, keine Rätsel, keine Gegner.

> Milestone-Status: **M1** (Projektsetup + Player-Movement auf einer Ebene +
> GitHub-Pages-Deployment). Ebenen/Transition folgen in M2–M3.

## Tech-Stack

- [Phaser 4](https://phaser.io/) (Arcade Physics)
- TypeScript (strict)
- Vite
- Vitest (Unit-Tests für rein logische Teile)

## Schnellstart

```bash
npm install
npm run dev      # Dev-Server (http://localhost:5173)
npm run build    # Typecheck (tsc) + statischer Build nach dist/
npm run preview  # gebautes dist/ lokal servieren
npm run test     # Unit-Tests (Movement-Timings)
npm run typecheck
```

## Steuerung

| Taste | Aktion |
| --- | --- |
| `A` / `←` , `D` / `→` | Laufen (mit Beschleunigung/Abbremsen) |
| `Leertaste` / `↑` | Springen (variable Höhe: früh loslassen = kürzer) |
| `W` / `↑` , `S` / `↓` | Ebenenwechsel an Wechselpunkten *(ab M3)* |
| `F1` | Debug-Overlay *(ab M4)* |

Coyote Time (~100 ms) und Jump Buffering (~120 ms) sind aktiv.

### Am Handy (Touch)

Auf Touch-Geräten erscheinen **On-Screen-Buttons**: ◀ / ▶ zum Laufen (halten),
▲ zum Springen (kurz antippen = kürzerer Sprung), sowie ⛶ oben rechts für den
**Vollbild-Modus**. Das Spiel ist fürs **Querformat** ausgelegt; im Hochformat
erscheint ein Hinweis, das Gerät zu drehen. Tastatur und Touch funktionieren
parallel.

## Tuning

Alle spielrelevanten Werte liegen zentral in
[`src/config/GameConfig.ts`](src/config/GameConfig.ts) — Movement (Speed,
Gravity, Jump, Timings), Layer-/Diorama-Parameter und Transition (Dauer/Easing).
Für Movement-Feel zuerst an `player.moveAccel`, `player.maxSpeed`,
`player.jumpVelocity`, `player.variableJumpCut`, `player.coyoteMs` und
`player.jumpBufferMs` drehen.

## Grafik / Art-Direction

Komplett **Schwarz-Weiß/Graustufen** in einer **dunklen Umgebung**: Lampen
(auch schwingende) beleuchten die Szene, der Spieler wirft mitschwingende
Schatten und ist selbst nur als **leuchtende Augen** sichtbar. Alle Licht-,
Schatten- und Augen-Werte stehen unter `GameConfig.lighting`. Texturen sind
generiert (keine Download-Abhängigkeit); Kenney-CC0-Slot siehe
[`public/assets/.gitkeep`](public/assets/.gitkeep).

## Projektstruktur

```
src/
  main.ts              Phaser-Bootstrap
  config/GameConfig.ts  zentrale Tunables
  scenes/               BootScene (Texturen), GameScene (Welt)
  entities/             Player, movement.ts (pure, testbar)
tests/                  Vitest
scripts/gen-index.mjs   Branch-Index für GitHub Pages
.github/workflows/      Deploy-Workflow
```

Architektur-Überblick und Konventionen: siehe [`CLAUDE.md`](CLAUDE.md).

## Deployment: GitHub Pages pro Branch

Bei **jedem Push** baut der Workflow
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) den Vite-Build und
deployed ihn auf den `gh-pages`-Branch in ein **Unterverzeichnis pro Branch**.
Eine generierte Root-`index.html` listet alle deployten Branches mit Links.

### Einmalige Aktivierung (Repo-Einstellung)

> **Ohne diesen Schritt sind die Seiten nicht erreichbar.**

1. GitHub → **Settings → Pages**
2. **Build and deployment → Source: „Deploy from a branch"**
3. **Branch: `gh-pages`**, Ordner **`/ (root)`** → **Save**

(Der `gh-pages`-Branch entsteht automatisch beim ersten erfolgreichen Workflow-Lauf.)

### URL-Struktur

```
Übersicht aller Branches:  https://flip012.github.io/snootventure/
Ein Branch-Build:          https://flip012.github.io/snootventure/<branch>/
```

Da Branch-Namen Slashes enthalten dürfen, wird der Build in einem
verschachtelten Unterverzeichnis abgelegt. Konkrete Test-URL dieses Branches:

```
https://flip012.github.io/snootventure/claude/mensch-hund-layers-prototype-aj6mu2/
```

Der Vite-`base`-Pfad wird im Workflow automatisch pro Branch gesetzt
(`VITE_BASE=/snootventure/<branch>/`), damit Assets korrekt laden.

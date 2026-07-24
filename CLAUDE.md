# CLAUDE.md — Snootventure Layer-Prototyp

## Stack

Phaser 4 (npm `phaser@^4.2.1`) + TypeScript strict + Vite + Arcade Physics.
Tests: vitest, nur für pure Logik (kein Rendering-Test-Theater).

## Kommandos

- `npm run dev` / `npm run build` / `npm run preview`
- `npm run typecheck` (tsc strict, noEmit)
- `npm run test` (vitest)

## Zentrale Architektur-Entscheidungen

### 1. Physik entkoppelt von Präsentation (wichtigste Regel)

Arcade-Physics-Bodies leben im Welt-Koordinatensystem und folgen NICHT den
Transforms von Phaser-Containern. Deshalb:

- **Kanonische Koordinaten:** Plattform-Geometrie jeder Ebene liegt unskaliert
  in Weltkoordinaten als `StaticGroup`. Kollision strikt pro Ebene über
  separate Collider — eine Entity kollidiert nur mit der StaticGroup ihrer
  aktuellen Ebene.
- **Präsentation:** Pro Ebene ein `Container` mit visuellem Transform (Scale,
  Y-Offset, Tint/Alpha, Depth) abhängig vom Abstand zur aktiven Ebene
  (Diorama-Effekt).
- **Entities (ab M2):** unsichtbarer Physics-Body in kanonischen Koordinaten +
  Display-Sprite als Kind des Layer-Containers. Pro Frame wird die lokale
  Sprite-Position aus dem Body übernommen. Auf der aktiven Ebene (Scale 1,
  Offset 0) fallen Body und Sprite exakt zusammen. Dieses Modell trägt später
  zwei Entities (Mensch + Hund) auf verschiedenen Ebenen.

### 2. Ebenen-Transition (ab M3)

- Während der Transition wird der Player-Body **eingefroren** (Velocity 0,
  Gravity aus, Zustand gesichert). Nach Abschluss: auf Zielebene re-aktivieren,
  Grounded neu bestimmen.
- Die kanonische Position bleibt beim Wechsel erhalten. **Bewusst erlaubt:**
  Hat die Zielebene an dieser Stelle keine Plattform, fällt der Player.
- Switch-Zonen sind kanonische Rechtecke; Eligibility = Body-Overlap mit der
  Zone. **Kein Grounded-Zwang** — Wechsel ist auch in der Luft erlaubt.
- Der LayerManager blockt zusätzliche Wechsel, solange eine Transition läuft
  (Guard).

### 3. Movement (M1)

- Horizontale Geschwindigkeit wird NICHT über Arcade-Accel/Drag gesteuert,
  sondern pro Frame aus den puren Funktionen in `src/core/movement.ts`
  berechnet und via `setVelocityX` gesetzt → deterministisch testbar.
- Coyote Time + Jump Buffering als Zeitfenster (`JumpTimers`), beide werden
  beim Sprung konsumiert (ein Druck = ein Sprung).
- Variable Sprunghöhe: Loslassen im Aufstieg kappt v_y einmalig um
  `variableJumpCut`.
- Sprungtaste ist **nur Space** — W/S und ↑/↓ sind für den Ebenenwechsel (M3)
  reserviert.

### 4. Deployment

- GitHub Pages pro Branch: `gh-pages/<branch>/`, Vite-`base` wird im CI aus
  `github.ref_name` gesetzt (`VITE_BASE`). Branchnamen mit Slashes ergeben
  verschachtelte Verzeichnisse — gewollt und unproblematisch.
- `peaceiris/actions-gh-pages` mit `destination_dir` + `keep_files: true`;
  Root-`index.html` (Branch-Liste) via `scripts/gen-index.mjs`.

## Konventionen

- Alle Tuning-Werte ausschließlich in `src/config/GameConfig.ts`.
- Textur-Keys stabil halten (`player`, `block`) — Drop-in-Slot für
  Kenney-CC0-Assets in `BootScene`.
- Pro Milestone: Self-Review (TS-strict, Physik-Edge-Cases:
  Transition-im-Sprung, Wechselpunkt-am-Rand, tote Logik) vor dem Commit.

## Milestone-Status

- [x] M1 — Setup + Movement (eine Ebene) + Deploy-Pipeline
- [ ] M2 — LayerManager + statische Ebenendarstellung (3 Ebenen, Diorama)
- [ ] M3 — Wechselpunkte + getweente Transition + Physik-Freeze
- [ ] M4 — Testlevel + Debug-Overlay + Politur

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

### 4. Noir-Look + Licht/Schatten (LightingSystem)

- Komplett Graustufen: Palette in `layerColors`, Player = schwarze Silhouette;
  die **Augen sind ein eigenes Overlay-Sprite über der Dunkelheits-Maske** —
  im Dunkeln bleiben nur sie sichtbar.
- Dunkelheit = bildschirmfüllende `RenderTexture` (scrollFactor 0), pro Frame:
  `clear()` → `fill(schwarz, overlayAlpha)` → pro Lampe radialen Gradient
  per ERASE ausstanzen. **Phaser-4-Falle:** Zeichenbefehle sind gepuffert und
  laufen erst bei explizitem `rt.render()`.
- Maske läuft intern mit `maskResolution` (0.5 = 4x weniger Fillrate,
  hochskaliert) — wichtig für Mobile/Software-Rendering.
- Lampen sind Level-Daten (`testLevel.ts`): Aufhängung + Seillänge + Radius,
  optional `swing` (Pendel). Schwingen = Rotation eines Sub-Containers an der
  Aufhängung; Lichtposition aus purer Pendel-Mathe (`lightMath.ts`).
- Lampen kleben an ihrer Ebene: Position/Größe/Stärke folgen dem
  Container-Transform; fernere Ebenen leuchten schwächer (`depthDimming`),
  die ausgeblendete Front-Ebene gar nicht (Container-Alpha).
- Spieler-Schatten: pro Lampe der aktuellen Ebene eine weiche Ellipse an den
  Füßen, wandert von der Lampe weg und streckt sich (`shadowFrom`) — bei
  schwingenden Lampen entsteht der Schatten-Sweep. Pausiert während der
  Transition.
- Depth-Schichten: Ebenen-Container (-2..2) < Schatten (5) < Maske (150)
  < Lampen-Koronen (160) < Augen (210) < HUD (300).

### 5. Mensch + Hund an der Leine (M4)

- Beide sind `Entity`s mit Body/Display-Split — die Architektur trägt sie auf
  getrennten Ebenen; aktuell wechselt der Hund mit (`switchTo(..., onComplete)`
  hängt ihn auf der Zielebene wieder ein).
- **Leine = einseitiger Feder-Constraint** (`leash.ts`): unterhalb der
  Ruhelänge schlaff (schiebt nie), darüber zieht sie beide Enden zueinander.
  Der Hund bekommt die volle Kraft, der Mensch nur `playerTug`.
- **Gegenwehr:** `playerLeashResponse` — kein/gleichgerichteter Input ⇒ voller
  Zug, der Mensch wird mitgezogen. Gegenläufiger Input ⇒ Zug gedämpft
  (`resistDamping`), dafür sinkt seine Höchstgeschwindigkeit (`maxSlowdown`).
- **Hund mit eigenem Kopf** (`dogBrain.ts`): Zustandsmaschine follow/sniff/
  wander mit injizierbarem RNG (deterministisch testbar). Straffe Leine
  erzwingt sofort `follow`.
- Der Hund springt nur ~19 px (`dog.jumpVelocity`) — Treppenstufen (67 px)
  schafft er nicht allein, der Mensch muss ihn hochziehen. Sein Hüpfer löst
  nur aus, wenn die Leine ihn nach oben zerrt (mit Cooldown gegen Dauerhüpfen).
- **Bei straffer Leine läuft der Hund nach** (`mood ?? dogFollowInput`), er
  wird NICHT schlaff. Sonst hängt er am Leinenende fest und bremst den
  Menschen dauerhaft aus.

### 5b. Schnüffelstellen und Hundeverhalten

- Bewuchs (`props` in `testLevel.ts`: Busch, Strauch, Gras, Unkraut, Poller)
  ist zugleich Deko und Datenquelle: Alles mit `appeal > 0` wird zur
  `SniffSpot` auf seiner Ebene.
- **Interesse fällt quadratisch mit dem Abstand** (`spotInterest`) — geht der
  Mensch weiter, verliert der Hund schnell die Lust, statt den Fluss zu
  blockieren. Aufgegebene Stellen bekommen eine Sperrzeit, damit er nicht
  sofort umkehrt. Stellen jenseits der Leinenreichweite wählt er gar nicht.
- **Rückruf statt hartem Cutoff** (`recallChance`): ab `recallStartRatio` der
  Leinenlänge steigt die Rückkehr-Wahrscheinlichkeit pro Sekunde quadratisch
  an. Der harte `leashHeel`-Stopp bleibt als letzte Sicherung.
- Weitere Stimmungen: `shake` (schütteln), `sit` (setzt sich, wenn der Mensch
  länger stillsteht — steht sofort wieder auf, sobald es weitergeht),
  `zoomies` (kurzer Übermuts-Sprint mit Extra-Tempo und Hüpfern). Beim
  Gehen trabt er dem Menschen um `trotAhead` voraus.
- Körpersprache läuft rein über Rotation/Skalierung der Silhouette
  (`Dog.animate`) — kein zusätzliches Textur-Material nötig.

### 6. Level-Design gegen Physik abgesichert

- Aus `jumpVelocity`/`gravityY`/`maxSpeed` folgen ~80 px Steighöhe und ~172 px
  Weite (`maxJumpHeight`/`maxJumpDistance` in `movement.ts`). Alle Stufen sind
  deshalb 67 px, alle Pflicht-Lücken 110 px.
- Erhöhte Plattformen sind nur `platformThickness` (16 px) dick. Sonst bleibt
  unter einer 67-px-Stufe zu wenig Durchgang und jedes Sims wird zur Wand —
  genau dieser Fehler hat den Spieler bei x 349 festgesetzt.
- `levelGeometry.test.ts` hält Geometrie und Physik zusammen: Treppe begehbar,
  Lücken überspringbar, Ziel **nur** über Zone D erreichbar, Hunde-Hüpfer
  kleiner als eine Stufe, **Kopffreiheit unter jedem Sims**. Ändert jemand die
  Tuning-Werte, schlägt der Test an.

### 7. Deployment

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
- [x] M2 — LayerManager + statische Ebenendarstellung (3 Ebenen, Diorama)
- [x] M3 — Wechselpunkte + getweente Transition + Physik-Freeze
- [x] M4 — Testlevel mit Ziel + Debug-Overlay (F1) + Hund an der Leine

# CLAUDE.md — Architektur & Konventionen

Leitfaden für Folgearbeiten an diesem Prototyp. Kurz halten, aktuell halten.

## Ziel & Scope

2D-Puzzle-Platformer mit **mehreren spielbaren Tiefenebenen**. Der Spieler
wechselt an markierten Wechselpunkten zwischen Ebenen (Diorama-Look). Später:
ein zweites Entity (Hund), das **gleichzeitig auf einer anderen Ebene** existiert.

**Bewusst (noch) NICHT enthalten:** Hund/Leine/KI, Rätsel, Gegner, Sound, Menüs,
Save-System, Tiled.

## Milestones

- **M1** ✅ Setup + Player-Movement (eine Ebene) + GitHub-Pages-Deployment.
- **M2** ✅ LayerManager + statische Ebenendarstellung (3 Ebenen, Diorama).
- **M3** Wechselpunkte + getweente Transition + Kamera-Zoom.
- **M4** Testlevel + Debug-Overlay + Politur (optional Kenney-Assets).

## Kern-Prinzip: Physik ≠ Präsentation

**Wichtigste Konvention.** Arcade-Physics-Bodies leben im Welt-Koordinatensystem
und folgen **NICHT** der Skalierung/Position eines Phaser-`Container`. Deshalb:

- **Physik (kanonisch):** Jede Ebene hat ihre Plattform-Geometrie in
  unskalierten Weltkoordinaten. Kollision **strikt pro Ebene** — eine Entity
  kollidiert nur mit den Static-Bodies ihrer aktuellen Ebene (separate Collider).
- **Präsentation (Diorama):** Pro Ebene ein `Container` mit visuellem Transform
  (Scale, Y-Offset, Tint/Alpha, Depth) je nach Abstand zur aktiven Ebene.
- **Entities:** Body in kanonischen Koordinaten + Display-Objekt als Kind des
  jeweiligen Layer-Containers. Pro Frame wird die Display-Position aus dem Body
  gesetzt; der Container-Transform erzeugt die korrekte Bildschirmposition. Für
  die aktive Ebene (Scale 1 / Offset 0) fallen Body und Display zusammen.

Dieses Modell ist die Voraussetzung dafür, dass ab M3 zwei Entities auf
verschiedenen Ebenen gleichzeitig simuliert und dargestellt werden können.

**Konkrete Umsetzung (ab M2):** Der Physics-Body (`Entity.physics`, unsichtbar)
lebt in Weltkoordinaten und ist NICHT Kind eines Containers — so umgehen wir die
Arcade-in-Container-Fallstricke. Das sichtbare `Entity.display` ist Kind des
Layer-Containers; `syncDisplay()` kopiert pro Frame die Body-Position hinein.
Der Diorama-Look entsteht, indem `Layer.updatePivot()` den Container pro Frame um
das Kamera-Zentrum skaliert (korrekte, parallaxe Tiefenwirkung). Reine
Transform-Mathematik steht Phaser-frei in `systems/layerTransform.ts` (getestet).

## Konventionen

- **Config zentral:** Alle Tunables (Movement, Timings, Layer-/Diorama-Werte,
  Transition-Dauer/Easing) stehen in `src/config/GameConfig.ts`. Keine
  Magic-Numbers im Gameplay-Code — von dort lesen.
- **Pure Logik testbar halten:** Feel-/Zustands-Logik ohne Phaser-Abhängigkeit
  (z. B. `src/entities/movement.ts`) in reine Funktionen auslösen und mit Vitest
  testen. Kein Rendering-Test-Theater.
- **Koordinaten:** „Kanonisch" = unskalierte Weltkoordinaten (Physik).
  Container-Transforms sind rein visuell.
- **TypeScript strict:** inkl. `noUncheckedIndexedAccess`. Array-Zugriffe ggf.
  absichern. Keine `any`.
- **Ordnerstruktur:** `scenes/`, `systems/` (ab M2: LayerManager, Layer,
  DebugOverlay), `entities/`, `config/`, `level/` (ab M4).

## Entscheidungen (dokumentiert statt nachgefragt)

- **Milestone-Kadenz:** Stop nach M1 (Deploy + Movement im Browser prüfen), dann
  M2→M3, Stop nach M3 (Transition muss manuell beurteilt werden).
- **Grafik/Art-Direction:** komplett Schwarz-Weiß/Graustufen, dunkle Umgebung.
  Tiefe liest sich über Skalierung/Versatz + „weiter hinten = dunkler". Kenney-
  CC0-Slot in `public/assets/` dokumentiert.
- **Beleuchtung & Schatten (`systems/LightingSystem.ts`):** Ein dunkles
  Screen-Space-Overlay (RenderTexture) wird pro Lampe per weichem Radial-ERASE
  „aufgerissen" → nur nahe Lampen sieht man die Umgebung. Lampen können
  **schwingen** (Pendel an einer Schnur); der Spieler wirft pro Lampe einen
  projizierten Schatten (schwingt mit). Der Spieler-Körper ist eine dunkle
  Silhouette (nur im Licht sichtbar); zwei **leuchtende Augen** liegen über dem
  Overlay und sind immer sichtbar. Alle Werte unter `GameConfig.lighting`.
- **Front-Layer-Ausblenden:** konfigurierbar (Fade + leichtes Nach-unten-Sliden),
  Default in `GameConfig.layers.frontHide`.
- **Transition-im-Sprung:** Player-Body wird während der Transition eingefroren
  (Velocity 0, Gravity aus, Zustand gesichert), danach auf der Zielebene
  re-aktiviert und Grounded neu bestimmt. Kanonische Position bleibt erhalten;
  hat die Zielebene dort keine Plattform, fällt der Player (bewusst erlaubt).
- **Wechselpunkt am Rand:** Switch-Zonen sind kanonische Rechtecke; Eligibility =
  Body-Overlap (kein Grounded-Zwang). Der `LayerManager` blockt weitere Wechsel,
  solange eine Transition läuft.
- **Deploy:** `peaceiris/actions-gh-pages` pro Branch in ein Unterverzeichnis
  (`keep_files: true`) + generierte Root-`index.html`. Vite-`base` kommt pro
  Branch aus `VITE_BASE`.

## Deployment

Siehe `README.md`. Kurz: Push → Workflow baut mit `VITE_BASE=/snootventure/
<branch>/` → Deploy nach `gh-pages/<branch>/`. Pages einmalig auf
`gh-pages` / root stellen. URL: `https://flip012.github.io/snootventure/<branch>/`.

## Befehle

```bash
npm run dev | build | preview | test | typecheck
```

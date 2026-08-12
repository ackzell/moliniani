# @moliniani/core — Roadmap

## Done

- **Unified API** — `mn()` dispatches to the Vue overlay or TresJS path automatically;
  `createMnRef()` covers both. Legacy `mountVue`/`MolinianiHandle`/`mnVue`/`mnTres`
  removed.
- **TresJS 3D support** — `TresNode` mounts a `TresCanvas` in manual render mode and
  blits it onto the canvas in `draw()` (`packages/core/src/TresNode.ts`).
- **HTML-in-canvas compositing** — Vue overlays are composited into the canvas via a
  bridge canvas + `drawElement` (`packages/core/src/compositor.ts`).
- **Export of overlays** — `molinianiExporterPlugin` wraps the FFmpeg exporter so
  composited overlays appear in exported video.
- **Text reveal** — `revealText()` for character-by-character `Txt` animation.
- **Scrubbing/seek fixes** — signal-driven props scrub correctly in both directions;
  the compositor and `TresNode` handle backward frame jumps.
- **Dynamic backgrounds** — `makeProject(settings, { background })` /
  `makeScene(runner, { background })` + `defineBackground()` in `@moliniani/core`
  (`packages/core/src/Background.ts`) and its canvas-draw sibling
  `defineCanvasBackground()`. Five built-ins ship from
  `@moliniani/components/backgrounds` (`GroovySquares`, `FlowField`,
  `Topographic`, `SugarGlass`, `KineticGrid`) with `#include` inlining at build
  time and a `backgroundCatalog` export to enumerate them. Clock is MC's
  project-global `time` uniform / virtual time (scrub-correct, continuous across
  scenes).

## To work on later

- **Pretext text layout** — the pluggable layout-engine hooks in `PretextText.ts`
  (`setTextLayoutEngine`, `enablePretextLayout`) are not well-defined and are not yet
  consumed by any component. Decide the feature (text-around-shapes /
  variable-width-lines) before wiring `@chenglou/pretext` into the render path.
- **Z-ordering** — Vue overlays always composite **above** MC 2D shapes; interleaving
  the two layers (a Vue overlay behind a `Rect`, etc.) is not possible yet.
- **Publishing** — `packages/core/package.json` still carries default "author/library"
  metadata placeholders and no real `homepage`/`repository`; publishing flow is unset.
- **Website** — `apps/website` is still boilerplate.
- **Background escape hatches** — the supported clock is MC's `time` uniform
  only, so custom speed/phase come from per-background props (`_Speed` is
  realized as `GroovySquaresBackground`'s `speed` prop). A `_Phase` uniform for
  per-background phase offsets is documented but not yet implemented.

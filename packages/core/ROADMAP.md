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

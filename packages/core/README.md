# @moliniani/core

The Vue ↔ Motion Canvas bridge. Mounts Vue SFCs (2D DOM overlays or TresJS 3D scenes)
as Motion Canvas nodes, so you can author video visuals in Vue and drive them from
MC's virtual timeline.

## What it provides

- **`makeScene()`** — scene wrapper that just delegates to Motion Canvas `makeScene2D`.
- **`mn()`** — places a Vue SFC (2D or TresJS 3D, auto-detected) as a node in a scene.
- **`createMnRef()`** — typed MC ref for a Vue SFC, for animating its props.
- **`defineVueNode()` / `defineTresNode()`** — wrap SFCs into MC node classes (the
  Vite plugin does this automatically for `.vue` imports).
- **`revealText()`** — character-by-character text reveal for MC `Txt` nodes.
- **`molinianiExporterPlugin()`** — registers the FFmpeg exporter that composites
  Vue overlays into exported video.
- A pluggable **text-layout engine** hook (Pretext integration is stubbed).

Prop animation is driven by **Motion Canvas signals**: numeric, color, and string
props declared on an SFC become tweenable/scrub-safe signals on the MC timeline.

## Docs

- [API.md](API.md) — full API reference.
- [EXAMPLES.md](EXAMPLES.md) — copy-paste recipes.
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the render paths and compositor work.
- [ROADMAP.md](ROADMAP.md) — status and future work.

# @moliniani/core

The Vue ↔ Motion Canvas bridge. Mounts Vue SFCs (2D DOM overlays or TresJS 3D scenes)
as Motion Canvas nodes, so you can author video visuals in Vue and drive them from
MC's virtual timeline.

## What it provides

- **`makeScene()`** — scene wrapper that just delegates to Motion Canvas `makeScene2D`.
- **`makeProject(settings, { background })`** — Motion Canvas `makeProject` wrapper
  that adds a project-wide dynamic background; scenes opt out or override per scene
  via `makeScene(runner, { background })`.
- **`defineBackground()` / `defineCanvasBackground()`** — build typed background
  node classes from a declarative config (GLSL fragment shader or Canvas-2D
  painter respectively), each prop a tweenable MC signal.
- **`background(Ctor, props?)`** — lazy, configured-background descriptor for use
  at module scope where nodes can't be constructed yet.
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

For dynamic backgrounds, see the [Dynamic backgrounds](API.md#dynamic-backgrounds)
section of the API reference — it covers `makeProject(settings, { background })`,
`makeScene(runner, { background })`, `defineBackground()`, `defineCanvasBackground()`,
the `background()` descriptor, and the `Background` base class.

## Docs

- [API.md](API.md) — full API reference.
- [EXAMPLES.md](EXAMPLES.md) — copy-paste recipes.
- [ARCHITECTURE.md](ARCHITECTURE.md) — how the render paths and compositor work.
- [ROADMAP.md](ROADMAP.md) — status and future work.

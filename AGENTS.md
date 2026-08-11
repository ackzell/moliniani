# AGENTS.md

Guidance for coding agents working in this repository.

## What this project is

**Moliniani** is a Vue-native authoring layer for programmatic video, built on top
of [Motion Canvas](https://motioncanvas.io). You write visuals as Vue SFCs and use
them directly as Motion Canvas nodes in your scenes.

Two render paths are supported:

- **2D Vue SFCs** — mounted as DOM overlays and composited into the canvas via an
  HTML-in-canvas bridge (see `packages/core/src/compositor.ts`).
- **TresJS 3D SFCs** — mounted into a WebGL `TresCanvas` in manual render mode and
  blitted onto the canvas in `draw()` (see `packages/core/src/TresNode.ts`).

Prop animation happens through **Motion Canvas signals** on MC's virtual timeline,
so tweening, seeking, and scrubbing work exactly like native MC nodes. There is no
GSAP and no wall-clock animation.

## Repository layout

- `packages/core` — the library (`@moliniani/core`): the Vue↔MC bridge, compositor,
  exporter, text helpers. Docs live here too: `API.md`, `ARCHITECTURE.md`,
  `EXAMPLES.md`, `ROADMAP.md`.
- `packages/components` — `@moliniani/components`: ready-made MC nodes and
  pre-wrapped Vue SFCs. Root entry (`TypewriterText`) is native MC; the `./vue`
  entry (`Typewriter`) ships pre-wrapped SFCs. The SFCs are precompiled to
  `src/vue/*.gen.ts` by `scripts/compile-vue.mjs` (`pnpm gen` / auto-run by the
  `build`/`test`/`check` scripts); never hand-edit generated files.
- `packages/utils` — `@moliniani/utils`: framework-free helpers (`revealText()`,
  `floatIt()`). `@moliniani/core` re-exports `revealText()` for back-compat.
- `packages/vite-plugin` — `@moliniani/vite-plugin`: auto-wraps every `.vue` import
  with `defineVueNode()` so SFCs are usable in MC JSX with no boilerplate.
- `apps/playground` — a Motion Canvas project used as the **manual test harness**.
  Run it with `pnpm playground`; it aliases `@moliniani/core`, `@moliniani/utils`,
  `@moliniani/components`, and `@moliniani/components/vue` to the packages' `src`
  and contains Vue (`example`) and TresJS (`tresjs`) scenes.
- `apps/website` — project site, currently boilerplate/WIP.

## Toolchain

pnpm workspaces + [Vite+](https://viteplus.dev/guide/) (`vp`) as the unified toolchain.

```bash
# Install dependencies
vp install

# Run all tests (packages/core runs under jsdom)
vp run -r test

# Build all packages
vp run -r build

# Lint + typecheck (formatting auto-fixes via staged hook on commit)
vp check

# Run a single package's script, e.g.
pnpm --filter core test
pnpm --filter core check

# Start the playground (Motion Canvas editor)
pnpm playground
```

`vp check` runs formatting + lint + typecheck with type-aware options. Always run it
(after tests) before finishing changes. There is no standalone prettier/eslint setup.

## Conventions

- Use only the **current public API**: `makeScene()`, `mn()`, `createMnRef()`,
  `defineVueNode()`, `defineTresNode()`, `revealText()`, `molinianiExporterPlugin`.
  From `@moliniani/components`: `useAnime()` is the escape hatch for driving an
  animejs timeline from MC virtual time (see the porting guide in
  `packages/components/README.md`). The low-level per-frame hook is the
  `MOLINIANI_VUE_NODE_CONTEXT` seam (`registerFrameUpdater` / `readProp`),
  documented in `packages/core/API.md`.
  Older APIs (`mountVue`, `createVueRef`, `mnVue`, `mnTres`, `createTresRef`,
  `MolinianiHandle`) were removed or deprecated — do not use or document them.
- **In scenes, use Vue SFCs directly as JSX tags** (`<MyBox label="Hello" x={-400} />`).
  The Vite plugin wraps every `.vue` import into a Motion Canvas node class, so tags
  work 1:1; `mn()` remains supported as sugar for `jsx()`. The Vite plugin detects
  TresJS 3D components by a `Tres`-prefixed filename and wraps them with
  `defineTresNode()`, so `<TresBox ... />` mounts as a WebGL node. Name new 3D scene
  components accordingly (or set `__mnTres` / `__mnTresWrapped` markers).
- Numeric, CSS-color, and plain-string props declared on an SFC automatically become
  MC timeline signals; tween them with `yield* nodeRef().prop(to, duration, ease)`.
  `opacity` (and other MC node keys) are owned by MC, not passed to Vue.
- Never hand-edit the generated `*.vue.d.ts` files — the Vite plugin emits them next
  to every `.vue` import, carrying the SFC's `defineProps` types so JSX props and
  `createMnRef()` methods are type-checked.
- Never hand-edit `packages/components/src/vue/*.gen.ts` — `scripts/compile-vue.mjs`
  regenerates them from the matching `.vue` SFCs. They are excluded from formatting
  via `packages/components/.prettierignore`, and carry `// @ts-nocheck` +
  `/* eslint-disable */` headers.
- Keep `packages/core` free of node-only and DOM-only dependencies; core tests run
  in jsdom with mocked MC core/2d (see `tests/mount.test.ts`).
- **Dynamic backgrounds are tuned visually before tests are locked.** When
  adding/changing a catalog background (a `defineBackground` shader or a
  `defineCanvasBackground` canvas painter in `packages/components/src/backgrounds/`),
  the look and the knob defaults (colors, `density`/`speed`/…) are still being
  tuned until the user confirms it in the playground (`pnpm playground`). Do
  **not** update the config-capture test (`tests/*Background.test.ts`) or
  re-document exact defaults in the README table until that visual confirmation —
  a stale test is expected during iteration and gets updated after. Structural
  facts that are safe to write early: prop names, prop types, and (for shaders)
  the uniform↔prop map. See [Porting gallery backgrounds](#porting-gallery-backgrounds-radiant-shaderscom)
  below for the full new-background workflow.
- **Background prop prose is single-source and generated.** Every prop's hover
  docs (JSX attributes, `background(Ctor, props)` configs, and `createMnRef()`
  tween methods) come from **one** `description` string in the `props` config,
  copied into `*.background.gen.ts` by `scripts/gen-background-docs.mjs`
  (auto-run by the `gen`/`build`/`test`/`check` scripts — never hand-edit the
  generated files). Keep each description table-safe (no `|`, backticks, or
  newlines) so it can render in JSDoc and Markdown alike; lines longer than
  ~78 characters are wrapped by the generator.
- **GLSL files must never contain backticks () or `${` — not even in comments.**
  Motion Canvas's `webgl` plugin inlines every `.glsl` into a JS template literal
  (`export default \`...\``), so a stray backtick closes the literal early and
the rest of the shader is parsed as JS (`Uncaught SyntaxError: Unexpected
  identifier ...` at runtime). Introduce a background's first GLSL edit at your
own risk; prefer plain quotes in comments (`the "palette" array`).
- **`GL_INVALID_OPERATION: glUniform1i ... Uniform type does not match ...` in
  the console is MC-core noise, not a bug in the background.** MC 2d 3.17.2
  (`Node.ts` `shaderCanvas`) unconditionally uploads the integer `playback.frame`
  into the shared **float** `time` uniform for every shader — the call is
  rejected by WebGL and leaves `time` at the value set by the preceding
  `uniform1f(globalTime)` just before it, so the shader renders/animates
  correctly (scrub-correct, deterministic). Browsers suppress repeats after the
  first. It fires for GroovySquares too and is still present on MC `main`.
  Don't chase it; don't introduce per-frame time plumbing to work around it.

## Porting gallery backgrounds (radiant-shaders.com)

The `radiant-shaders.com` gallery is where `GroovySquaresBackground` and
`FlowFieldBackground` came from; its source is the `pbakaus/radiant` repo, one
`static/<id>.html` per effect (the flow-field port analyzed
`static/flow-field.html`). Use this recipe for each new port, and follow the
background-tuning rule above: tune in the playground, get the user's visual
confirmation, then lock tests/docs.

1. **Fetch the source** — the HTML embeds the JavaScript and shaders. Grab the
   raw file into a scratch path outside the repo (e.g.
   `curl -L https://raw.githubusercontent.com/pbakaus/radiant/main/static/<id>.html -o /tmp/<id>.html`)
   and read the JS/shader inline.
2. **Classify the mechanism**:
   - Stateless, single-pass fragment shader (pattern recomputed each frame from
     `time` alone, no cross-frame state) → `defineBackground` + `shader.glsl`
     (the groovy-squares path).
   - Canvas-2D accumulation (particles/trails with per-frame strokes and fading
     state) → `defineCanvasBackground` + a `renderer.ts` (the flow-field path).
3. **Strip interactivity** — drop mouse/keyboard/URL-param/pointer logic; keep
   only the time-driven behavior.
4. **Determinism, no wall clock** — canvas renderers receive virtual `time`
   (`playback.frame / fps`) from the `canvas` callback. Rebuild state
   deterministically on seek, advance incrementally only on contiguous frames,
   seed per-particle RNG by index (mulberry32-style hash), and fade trails with
   `exp(-k * age)` as the original does.
5. **Constants → props** — mirror the original defaults 1:1 (`SPEED`, scales,
   palettes, alpha ranges). Rename to dodge MC collisions: prop names are
   guarded against built-in node props (`scale` → `noiseScale`); a throw tells
   you a name is reserved.
6. **Docs the IDE shows** — each prop carries **one** canonical prose source:
   the config `description` string (read via `__mnBackground.props`).
   `scripts/gen-background-docs.mjs` (auto-run by the components
   `gen`/`build`/`test`/`check` scripts) copies it verbatim into two generated
   interfaces, so every hover surface reads the same bytes:
   - `<Name>BackgroundProps` in `background.gen.ts` — JSX attributes and
     `background(Ctor, props)` configs (the `H` generic).
   - `<Name>BackgroundSignals` in `background.gen.ts` — `createMnRef()`
     tween-method hovers (`bgRef().prop(...)`) via the constructor `S`
     generic.
     The class doc's `@remarks` links to both instead of duplicating a table.
     Never hand-edit the generated `*.background.gen.ts`; edit the `description`,
     then `pnpm gen`. Every description says what the knob does **and** its
     practical value range: numbers get min–max, the default, and what the ends
     do; colors get accepted formats and an alpha note. Descriptions must stay
     **table-safe**: no `|`, backticks, or newlines — the generator throws
     otherwise (multi-sentence prose, en/em-dashes, quotes, and ranges are all
     fine).
7. **Codify gotchas** — `.glsl` files must never contain backticks or `${`
   (see the GLSL rule above); the console `glUniform1i` error is MC noise, not
   a shader bug (see above).

Then verify: `pnpm --filter components test`, `pnpm run -r check`, and
`pnpm --filter playground build`.

## Debugging

Moliniani has an opt-in debug logger. Enable it in the playground via:

```js
localStorage.setItem("moliniani:debug", "1");
// or set window.__MOLINIANI_DEBUG = true
```

## Notes

- `.github/copilot-instructions.md` is a symlink to this file — keep it that way.
- The core package's `package.json` still carries default "author/library" metadata
  placeholders; publishing is future work (see `packages/core/ROADMAP.md`).
- `vp run -r build` builds `core`, `components`, `utils`, `vite-plugin`, and
  `website`. The playground's production build (`pnpm --filter playground build`)
  works because its `vite.config.ts` ends with a small
  `moliniani:rolldown-target-fix` plugin whose `config` hook overrides the Motion
  Canvas plugin's `build.target: "modules"` with `"esnext"` (Rolldown rejects the
  esbuild-only `"modules"` target). Keep that override last in the plugins array or
  the build fails again.
- After any bump to the `vue` (or `@vue/runtime-*`) catalog entries, run
  `pnpm update -r` and confirm the playground and `@moliniani/core` resolve the
  **same** vue version (`pnpm --filter playground why vue`). A plain `pnpm
install` trusts stale lockfile importer pins, so a split (e.g. playground on
  `3.5.33`, core on `3.5.40`) silently breaks both render paths: the 2D overlay's
  scoped `v-bind()` styles stop applying and the TresJS scene mounts empty.

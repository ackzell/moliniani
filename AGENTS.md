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

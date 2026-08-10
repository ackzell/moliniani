# Handoff — Moliniani Dynamic Backgrounds (grilled plan)

**Date:** 2026-08-09
**Repo:** `/Users/ackzell/projects/oss/moliniani`
**Status:** Planning complete via `/grilling`. Nothing implemented, no repo changes made. **Next-session focus (user's explicit ask):** "create and document this as a design doc before we implement."

## 1. Goal

Reusable **"dynamic backgrounds"**: full-frame, ambient, GLSL-driven native Motion Canvas nodes that sit _behind_ scene content; built-ins ship like the text-effect catalog, and users author custom ones ("hand-rolled") with the same factory.

Reference implementation in sibling repo `/Users/ackzell/projects/oss/tlapalli-video` (`src/shaders/groovy-squares.glsl` + `src/lib/background.tsx`). A raw, unwired seed already exists in moliniani at `packages/components/src/backgrounds/`.

## 2. Locked decisions (grill outcome — the "why")

1. **Native MC nodes only — NO Vue authoring.** The 2D compositor (`packages/core/src/compositor.ts`) always blits Vue/DOM overlays _on top of_ MC 2D content; interleaving behind MC shapes isn't possible yet (ROADMAP.md). A background behind content must be a native MC `Rect` + `shaders` node.
2. **Terminology:** "**dynamic backgrounds**."
3. **Clock = MC's built-in project-global `time` only.** Verified in `@motion-canvas/core@3.17.2`: shader `time` uniform ← `view2D.globalTime()` (Node.js ~980) ← `scene.playback.time` (Scene2D.js:25,35) = `playback.frame/fps` on the shared project `PlaybackManager`. Continuous across scenes, scrubbing-correct. Do **not** use the `_Time`/spawned-tween machinery — the current seed does, but GLSL never declares `uniform float _Time`, so MC drops it silently (dead no-op). Future escape hatch (document only): `_Speed`/`_Phase` uniforms (~3 GLSL lines), deferred until a scene needs freeze/reverse/deterministic start.
4. **Shape:** `defineBackground(config)` factory (config-in → typed node class) **PLUS** exported extensible **`Background`** base class (power users `class X extends Background` for custom `setup()`/`teardown()`/WebGL needs). Both exported from `@moliniani/core`. Future 3D sibling: `TresBackground`. **Not** `ShaderBackground` (the `.glsl` detail is implementation).
5. **Auto size from `useScene().getSize()`; frame-locked default (`zIndex=-100`); `width`/`height` as opt-out escape hatch.** No hardcoded 1920×1080.
6. **Project-level global via Moliniani-owned wrappers — NOT an MC plugin.** `makeProject(settings, { background })` — second-arg **`MolinianiProjectConfig`** bag (keeps MC's `ProjectSettings` pure, signals "we extend MC"). Per scene: `makeScene(runner, { background })` override, `{ background: false }` opt-out, automatic reapplication otherwise. Injection happens at generator **run-time** from a module-level context holding a **factory** (fresh node per scene, since the node can't be reparented). MC _does_ have a plugin system (see `Plugin` hooks + existing `molinianiExporterPlugin` in `packages/core/src/exporter.ts`), but plugin injection requires rewriting `FullSceneDescription.config` — fragile coupling to MC internals precisely where the user is MC-update-sensitive.
7. **Language matrix (the WGSL/TSL answer):** 2D MC native → GLSL ES 3.00 only (WebGL2; no WebGPU/WGSL in MC 3.17). TresJS path (`TresNode.ts`) uses three `WebGLRenderer` r180 (`alpha: true`) → TSL works there (compiles to GLSL). **`defineTresBackground` deferred to ROADMAP**, consciously.
8. **Catalog:** built-ins = named exports under `@moliniani/components/backgrounds` subpath (no runtime registry). v1 ships exactly **one built-in: GroovySquares**. A second, structurally different background (e.g. static, non-time-driven) is the first follow-up, not a v1 gate.
9. **Per-scene independence is safe:** each scene builds a fresh tree (PlaybackManager.next → nextScene.reset); the global bg re-resolved per scene; override/opt-out scope to that scene. Hard cuts at scene boundaries are acceptable. MC scene transitions are a separate future "catalog extension."
10. **No mid-scene bg swap in v1** (tween out + replace within one scene) — a future knob, not now.

## 3. Target API

```ts
import { defineBackground, Background } from "@moliniani/core";

const GroovySquaresBackground = defineBackground({
  name: "GroovySquares",
  fragment: groovyShader,            // imported .glsl
  props: {
    color0:  { type: "color", default: "#02020266" },
    color1:  { type: "color", default: "#5c5c5c66" },
    density: { type: "number", default: 7.6 },
    random:  { type: "number", default: 16 },
  },
  uniforms: { _Color0: "color0", _Color1: "color1", _Number: "density", _Random: "random" },
});
// -> returns a typed Background subclass usable as <GroovySquaresBackground ... /> with autocomplete

// scene usage
const bg = yield* view.add(<GroovySquaresBackground color0="#3a3a3a" density={9} />);
yield* bg.color0("#ffd000", 1, easeInOutCubic);

// project-level global background
makeProject(
  { scenes: [...] },                // MC's ProjectSettings, untouched
  { background: groovy },           // MolinianiProjectConfig
);
makeScene(runner, { background: custom }); // per-scene override
makeScene(runner, { background: false });  // per-scene nowhere
```

Returned classes must expose typed `static props` so JSX and `createMnRef()` methods are type-checked (mirror the `.vue.d.ts` guarantees).

## 4. Implementation steps (order)

1. **Core base** — `packages/core/src/Background.ts`: extends Rect, default `zIndex=-100`, view-auto-size, prop→uniform binding (Color via `Color` + `toUniform`), `setup()`/`teardown()` hooks. Export from core `index.ts`.
2. **Core factory** — `packages/core/src/Background` exports `defineBackground(config)` building typed subclass; small prop-signal mapper.
3. **Core wrappers** — update `packages/core/src/scene.ts` (`makeScene` `{ background }` support) + new `makeProject` wrapper with module-level background-factory context (fresh node per scene at generator run-time).
4. **Components built-in** — port `backgrounds/groovy-squares/` to `defineBackground`; export in `src/backgrounds/index.ts`.
5. **Publishing** — add `./backgrounds` to `packages/components/package.json` `exports` + build `entry` in its `vite.config.ts` (currently `["src/index.ts","src/vue/index.ts"]`). Declare `vite-plugin-glsl` as a real dependency (currently hoisted/under-declared misuse; tsconfig uses `"types": ["node","vite-plugin-glsl/ext"]` but it is not in package.json/lockfile). Verify bundled `.glsl` ships in `dist`.
6. **Playground** — register `apps/playground/src/scenes/shader-background.tsx` in `project.ts` (currently NOT registered). Alias `@moliniani/components/backgrounds` already wired in playground `vite.config.ts`. Demo global / per-scene override / opt-out.
7. **Docs** — `API.md` (defineBackground, Background, makeProject/MolinianiProjectConfig), components README background authoring guide. ROADMAP: TSL `TresBackground`, transitions catalog, `_Speed`/`_Phase`.

**Verify:** `vp run -r test` then `vp check` (per AGENTS.md). Add core tests in the existing jsdom/MC-mocked style (see `packages/core/tests/mount.test.ts`) + a components-level test for GroovySquares node props.

## 5. Key files / facts for the next agent

- Seed to port is at `packages/components/src/backgrounds/{index.ts,groovy-squares/background.tsx,groovy-squares/shader.glsl}`. **Do not reproduce** — the dead `_Time`/`spawn` code in `background.tsx` is a no-option; replace, don't repair.
- MC 3.17.2 has **no** `Shader`/`glsl` node component — the API is `PossibleShaderConfig` via the `shaders` signal on `Node` (`Node.d.ts` / `ShaderConfig.d.ts`); a fullscreen `Rect` is the host.
- MC's uniform loop (`Node.js` `shaderCanvas`) unwraps each uniform then branches number / `toUniform` / array len 1–4; missing-location uniforms are skipped (why `_Time` was a no-op).
- `@motion-canvas/core` & `@motion-canvas/2d` are catalog-pinned at `3.17.2` — keep in sync; `/grilling` previously removed stale pinning concerns.
- `AGENTS.md` is the operator's handbook (symlinked as `.github/copilot-instructions.md`); never hand-edit generated `*.gen.ts`/`*.vue.d.ts`.

## 6. Suggested skills for the next session

- **find-skills** — invoke at design-doc/implementation time to check for any MC-shader/GLSL-authoring skill; none of the current catalog (animate-text, etc.) applies directly here.
- **grill-me** — the plan is already grilled and locked; only re-run if a new design fork opens during the design-doc pass (e.g. prop-type enumeration, `makeProject` bag naming).
- **handoff** — used to write this document; no further need.

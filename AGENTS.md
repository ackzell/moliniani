<!--VITE PLUS START-->

# Using Vite+, the Unified Toolchain for the Web

This project is using Vite+, a unified toolchain built on top of Vite, Rolldown, Vitest, tsdown, Oxlint, Oxfmt, and Vite Task. Vite+ wraps runtime management, package management, and frontend tooling in a single global CLI called `vp`. Vite+ is distinct from Vite, and it invokes Vite through `vp dev` and `vp build`. Run `vp help` to print a list of commands and `vp <command> --help` for information about a specific command.

Docs are local at `node_modules/vite-plus/docs` or online at https://viteplus.dev/guide/.

## Review Checklist

- [ ] Run `vp install` after pulling remote changes and before getting started.
- [ ] Run `vp check` and `vp test` to format, lint, type check and test changes.
- [ ] Check if there are `vite.config.ts` tasks or `package.json` scripts necessary for validation, run via `vp run <script>`.

<!--VITE PLUS END-->

---

# Moliniani — Copilot Context

## Project goal

Let frontend developers build programmatic videos using Vue SFCs, GSAP, and the broader Vue ecosystem. Motion Canvas provides the deterministic timeline, clock, and export pipeline. Moliniani bridges Vue into it.

## Before touching any code

Read in this order:

1. [`packages/core/ARCHITECTURE.md`](../packages/core/ARCHITECTURE.md)
2. [`packages/core/API.md`](../packages/core/API.md)
3. [`apps/playground/src/scenes/example.tsx`](../apps/playground/src/scenes/example.tsx)

## Key source files

| File                           | Role                                                          |
| ------------------------------ | ------------------------------------------------------------- |
| `packages/core/src/VueNode.ts` | Mounts Vue app into DOM; manages transforms and lifecycle     |
| `packages/core/src/mount.ts`   | `mountVue()` factory — populates the ref after nextTick       |
| `packages/core/src/ref.ts`     | `createMnRef()` — typing via `ComponentInstance<C>['$props']` |
| `packages/core/src/bridge.ts`  | `makeAnimatable()` — GSAP tween as `ThreadGenerator`          |
| `packages/core/src/ticker.ts`  | `runGSAPTicker()` — syncs `gsap.updateRoot` to MC frame time  |
| `packages/core/src/scene.ts`   | `makeScene()` — wraps `makeScene2D`, spawns ticker            |
| `packages/core/src/types.ts`   | `MolinianiHandle<P>`, `VueNodeConfig<P>`                      |

## Hard rules

- Do not add animatable methods for non-numeric props — the `typeof value === 'number'` guard in `VueNode.getHandle()` is intentional.
- Do not drive Vue's renderer per-frame. Vue updates happen on its own microtask schedule; GSAP mutates reactive state directly.
- All new animation primitives must yield a `ThreadGenerator` (use `makeAnimatable` or follow its pattern).
- Tests live in `packages/core/tests/`. Run `vp test` from `packages/core/` after any change.

## Validation

```bash
vp check   # lint + type check
vp test    # run unit tests (from packages/core/)
```

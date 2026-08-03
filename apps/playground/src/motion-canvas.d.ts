/// <reference types="@motion-canvas/core/project" />

/**
 * Fallback authoring shim for `*.vue` in Motion Canvas scene files.
 *
 * At runtime, Moliniani's Vite plugin wraps SFC default exports with
 * `defineVueNode()` / `defineTresNode()` and emits a *typed* declaration next to
 * each `.vue` file (e.g. `MyBox.vue.d.ts`), so processed components get full
 * prop IntelliSense. This wildcard only applies to `.vue` files the plugin has
 * not emitted a declaration for yet (e.g. brand-new SFCs before the first
 * dev-server run); keep it permissive so scene syntax stays 1:1 and cast-free.
 */
declare module "*.vue" {
  const VueNodeClass: new (props: Record<string, any>) => any;

  export default VueNodeClass;
}

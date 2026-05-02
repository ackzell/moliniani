/// <reference types="@motion-canvas/core/project" />

/**
 * Authoring shim for `*.vue` in Motion Canvas scene files.
 *
 * At runtime, Moliniani's Vite plugin wraps SFC default exports with
 * `defineVueNode()`. In editor/TS tooling, Vue language services can override
 * stricter constructor typings with component-instance types, which breaks JSX
 * NodeConstructor checks. Keep this declaration permissive so scene syntax can
 * remain 1:1 and cast-free.
 */
declare module "*.vue" {
  const VueNodeClass: new (props: Record<string, any>) => any;

  export default VueNodeClass;
}

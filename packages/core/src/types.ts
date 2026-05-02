// packages/core/src/types.ts
import type { Node, NodeProps } from "@motion-canvas/2d";
import type { View2D } from "@motion-canvas/2d";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { Component } from "vue";

export type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];

type AnimatableMethod = (
  to: number,
  duration?: number,
  ease?: string | ((t: number) => number),
) => ThreadGenerator;

type BuiltinTransforms = {
  x: AnimatableMethod;
  y: AnimatableMethod;
  scale: AnimatableMethod;
  rotation: AnimatableMethod;
  opacity: AnimatableMethod;
};

export type MolinianiHandle<P extends Record<string, any>> = {
  props: P;
  call<T = void>(method: string, ...args: unknown[]): Promise<T>;
  unmount(): void;
} & BuiltinTransforms & {
    [K in NumericKeys<P>]: AnimatableMethod;
  };

/**
 * The type returned by `defineVueNode()`.
 *
 * A constructor that creates a Motion Canvas Node whose Vue component props
 * are typed as `P`. Numeric Vue props have corresponding GSAP tween methods.
 *
 * At runtime instances ARE Node subclasses; the type intentionally avoids
 * referencing MC internals so it can be serialised to a `.d.ts` file cleanly.
 */
export type VueNodeConstructor<P extends Record<string, any>> = {
  isClass: true;
  new (props: NodeProps & P): Node & {
    readonly _vueState: P;
    getHandle(): MolinianiHandle<P>;
    [key: string]: any;
  } & {
    [K in NumericKeys<P>]: AnimatableMethod;
  };
};

/** @deprecated Use the native `view.add(<MyComponent />)` JSX syntax instead. */
export interface VueNodeConfig<P extends Record<string, any>> {
  component: Component;
  props: P;
  view?: View2D;
}

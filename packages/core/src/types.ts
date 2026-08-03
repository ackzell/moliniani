// packages/core/src/types.ts
import type { Node, NodeProps } from "@motion-canvas/2d";
import type { ThreadGenerator } from "@motion-canvas/core";

export type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];

export type StringKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends string ? K : never;
}[keyof P];

type Timing = string | ((t: number) => number);

type NumericMethod = (to: number, duration?: number, ease?: Timing) => ThreadGenerator;

type StringMethod = (to: string, duration?: number, ease?: Timing) => ThreadGenerator;

/**
 * The type returned by `defineVueNode()`.
 *
 * A constructor that creates a Motion Canvas Node whose Vue component props
 * are typed as `P`. Numeric Vue props have matching numeric animatable methods;
 * string Vue props (including CSS colors) have string animatable methods.
 *
 * At runtime instances ARE Node subclasses; the type intentionally avoids
 * referencing MC internals so it can be serialised to a `.d.ts` file cleanly.
 */
export type VueNodeConstructor<P extends Record<string, any>> = {
  isClass: true;
  new (props: NodeProps & P): Node & {
    readonly _vueState: P;
    [key: string]: any;
  } & {
    [K in NumericKeys<P>]: NumericMethod;
  } & {
    [K in StringKeys<P>]: StringMethod;
  };
};

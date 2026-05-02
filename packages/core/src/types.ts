// packages/core/src/types.ts
import type { View2D } from "@motion-canvas/2d";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { Component } from "vue";

type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];

type AnimatableMethod = (to: number, duration?: number, ease?: string) => ThreadGenerator;

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

export interface VueNodeConfig<P extends Record<string, any>> {
  component: Component;
  props: P;
  view?: View2D;
}

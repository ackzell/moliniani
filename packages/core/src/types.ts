import type { View2D } from "@motion-canvas/2d";
import type { ThreadGenerator } from "@motion-canvas/core";
import type { Component } from "vue";

// extracts keys from P where the value is a number
type NumericKeys<P> = {
  [K in keyof P]: NonNullable<P[K]> extends number ? K : never;
}[keyof P];

// the animatable method signature — matches MC's feel
type AnimatableMethod = (to: number, duration?: number, ease?: string) => ThreadGenerator;

// the full handle type
export type MolinianiHandle<P extends Record<string, unknown>> = {
  props: P;
  call<T = void>(method: string, ...args: unknown[]): Promise<T>;
  unmount(): void;
} & {
  [K in NumericKeys<P>]: AnimatableMethod;
};

export interface VueNodeConfig<P extends Record<string, unknown>> {
  component: Component;
  props: P;
  view?: View2D;
}

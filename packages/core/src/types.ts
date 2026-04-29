import type { Component } from "vue";

export interface MolinianiHandle<P extends Record<string, unknown>> {
  props: P;
  call<T = void>(method: string, ...args: unknown[]): Promise<T>;
  unmount(): void;
}

export interface VueNodeConfig<P extends Record<string, unknown>> {
  component: Component;
  props: P;
  // TODO: will be MC Node/View type once compositing layer is added
  view: unknown;
}

import type { DefineComponent, ComponentInstance } from "vue";
import type { MolinianiHandle } from "./types";

export type MnRef<P extends Record<string, any>> = {
  (): MolinianiHandle<P>;
  _component: DefineComponent<any, any, any>;
  _setHandle: (handle: MolinianiHandle<P>) => void;
};

export function createMnRef<C extends DefineComponent<any, any, any>>(
  component: C,
): MnRef<ComponentInstance<C>["$props"]> {
  type P = ComponentInstance<C>["$props"];

  let handle: MolinianiHandle<P> | null = null;

  const ref = () => {
    if (!handle) {
      throw new Error("MnRef: not mounted yet. Call yield mountVue() first.");
    }
    return handle;
  };

  ref._component = component;
  ref._setHandle = (h: MolinianiHandle<P>) => {
    handle = h;
  };

  return ref as unknown as MnRef<P>;
}

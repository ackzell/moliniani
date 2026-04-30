// packages/core/src/mount.ts
import { nextTick } from "vue";
import type { Component } from "vue";
import type { View2D } from "@motion-canvas/2d";
import { VueNode } from "./VueNode";
import type { MolinianiHandle } from "./types";
import type { MnRef } from "./ref";

export async function mountVue<P extends Record<string, any>>(
  view: View2D,
  componentOrRef: Component | MnRef<P>,
  props: P,
): Promise<MolinianiHandle<P>> {
  const isMnRef = typeof componentOrRef === "function" && "_component" in componentOrRef;

  const component = isMnRef
    ? (componentOrRef as MnRef<P>)._component
    : (componentOrRef as Component);

  const node = new VueNode({ component, props, view });
  await nextTick();

  const handle = node.getHandle() as MolinianiHandle<P>;

  if (isMnRef) {
    (componentOrRef as MnRef<P>)._setHandle(handle);
  }

  return handle;
}

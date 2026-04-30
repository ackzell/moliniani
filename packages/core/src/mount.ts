import { nextTick } from "vue";
import type { Component } from "vue";
import { VueNode } from "./VueNode";
import type { MolinianiHandle } from "./types";
import type { View2D } from "@motion-canvas/2d";

export async function mountVue<P extends Record<string, any>>(
  view: View2D,
  component: Component,
  props: P,
): Promise<MolinianiHandle<P>> {
  const node = new VueNode({ component, props, view });
  await nextTick();
  return node.getHandle() as MolinianiHandle<P>;
}

import { nextTick } from "vue";
import type { Component } from "vue";
import { VueNode } from "./VueNode";
import type { MolinianiHandle } from "./types";

export async function mountVue<P extends Record<string, unknown>>(
  view: unknown,
  component: Component,
  props: P,
): Promise<MolinianiHandle<P>> {
  const node = new VueNode({ component, props, view });
  await nextTick();
  return node.getHandle();
}

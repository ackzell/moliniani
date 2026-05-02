// packages/core/src/mount.ts
import { nextTick } from "vue";

import type { View2D } from "@motion-canvas/2d";
import { VueNode } from "./VueNode";
import type { MolinianiHandle } from "./types";
import type { MnRef } from "./ref";

export async function mountVue<P extends Record<string, any>>(
  view: View2D,
  ref: MnRef<P>,
  props: P,
): Promise<MolinianiHandle<P>> {


  const node = new VueNode({ component: ref._component, props, view });
  await nextTick();

  const handle = node.getHandle() as MolinianiHandle<P>;
  ref._setHandle(handle);

  return handle;
}
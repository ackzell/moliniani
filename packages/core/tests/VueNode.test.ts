import { describe, it, expect } from "vitest";
import { defineComponent, ref } from "vue";
import { VueNode } from "../src/VueNode";

const TestComponent = defineComponent({
  props: {
    title: String,
  },
  setup(_, { expose }) {
    const count = ref(0);
    expose({
      increment: () => count.value++,
      getCount: () => count.value,
    });
    return { count };
  },
  template: "<div>{{ title }}</div>",
});

describe("VueNode", () => {
  it("mounts a Vue component and returns a handle", () => {
    const node = new VueNode({
      component: TestComponent,
      props: { title: "Hello" },
      view: {} as any,
    });

    const handle = node.getHandle();
    expect(handle).toBeDefined();
    expect(typeof handle.call).toBe("function");
    expect(typeof handle.unmount).toBe("function");
  });

  it("exposes methods via getHandle", async () => {
    const node = new VueNode({
      component: TestComponent,
      props: { title: "Hello" },
      view: {} as any,
    });

    const handle = node.getHandle();
    await handle.call("increment");
    const count = await handle.call<number>("getCount");
    expect(count).toBe(1);
  });

  it("throws when calling a method that is not exposed", async () => {
    const node = new VueNode({
      component: TestComponent,
      props: { title: "Hello" },
      view: {} as any,
    });

    const handle = node.getHandle();
    await expect(handle.call("nonExistent")).rejects.toThrow("not exposed");
  });
});

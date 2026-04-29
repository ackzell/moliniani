import { describe, it, expect } from "vitest";
import { defineComponent, ref } from "vue";
import { mountVue } from "../src/mount";

const TestComponent = defineComponent({
  props: {
    opacity: Number,
    label: String,
  },
  setup(props, { expose }) {
    const internalCount = ref(0);
    expose({
      increment: () => internalCount.value++,
      getCount: () => internalCount.value,
    });
  },
  template: "<div>{{ label }}</div>",
});

describe("mountVue()", () => {
  it("returns a typed handle", async () => {
    const handle = await mountVue({}, TestComponent, { opacity: 0, label: "Hello" });

    expect(handle).toBeDefined();
    expect(typeof handle.call).toBe("function");
    expect(typeof handle.unmount).toBe("function");
  });

  it("props are reactive after mount", async () => {
    const handle = await mountVue({}, TestComponent, { opacity: 0, label: "Hello" });

    handle.props.opacity = 1;
    expect(handle.props.opacity).toBe(1);
  });

  it("can call exposed methods after mount", async () => {
    const handle = await mountVue({}, TestComponent, { opacity: 0, label: "Hello" });

    await handle.call("increment");
    const count = await handle.call<number>("getCount");
    expect(count).toBe(1);
  });

  it("unmount cleans up", async () => {
    const handle = await mountVue({}, TestComponent, { opacity: 0, label: "Hello" });

    expect(() => handle.unmount()).not.toThrow();
  });
});

import { describe, it, expect } from "vite-plus/test";
import { SplitUnitHandle } from "../src/SplitUnitHandle";

describe("SplitUnitHandle", () => {
  it("defaults to visible at the identity transform", () => {
    const el = document.createElement("span");
    const handle = new SplitUnitHandle("char", 0, el);

    expect(handle.type).toBe("char");
    expect(handle.index).toBe(0);
    expect(handle.element).toBe(el);
    expect(handle.opacity()).toBe(1);
    expect(handle.x()).toBe(0);
    expect(handle.y()).toBe(0);
    expect(handle.rotation()).toBe(0);
    expect(handle.scale()).toBe(1);
    expect(handle.blur()).toBe(0);
  });

  it("applies initial values", () => {
    const el = document.createElement("span");
    const handle = new SplitUnitHandle("word", 3, el, {
      opacity: 0,
      y: 40,
      blur: 12,
    });

    expect(handle.type).toBe("word");
    expect(handle.index).toBe(3);
    expect(handle.opacity()).toBe(0);
    expect(handle.y()).toBe(40);
    expect(handle.blur()).toBe(12);
  });

  it("syncDom writes signal values as inline styles", () => {
    const el = document.createElement("span");
    const handle = new SplitUnitHandle("char", 0, el);

    handle.x(10);
    handle.y(20);
    handle.rotation(45);
    handle.scale(2);
    handle.opacity(0.5);
    handle.blur(3);
    handle.syncDom();

    expect(el.style.opacity).toBe("0.5");
    expect(el.style.transform).toBe("translate(10px, 20px) rotate(45deg) scale(2)");
    expect(el.style.filter).toBe("blur(3px)");
  });

  it("clears the blur filter once blur drops to zero", () => {
    const el = document.createElement("span");
    const handle = new SplitUnitHandle("char", 0, el, { blur: 8 });

    handle.syncDom();
    expect(el.style.filter).toBe("blur(8px)");

    handle.blur(0);
    handle.syncDom();
    expect(el.style.filter).toBe("");
  });

  it("dispose clears inline styles", () => {
    const el = document.createElement("span");
    const handle = new SplitUnitHandle("char", 0, el);

    handle.opacity(0);
    handle.y(10);
    handle.syncDom();
    expect(el.style.opacity).toBe("0");

    handle.dispose();
    expect(el.style.opacity).toBe("");
    expect(el.style.transform).toBe("");
    expect(el.style.filter).toBe("");
  });
});

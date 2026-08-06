import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vite-plus/test";
import { defineComponent, nextTick } from "vue";
import { defineVueNode } from "../src/mount";
import { DependencyContext } from "@motion-canvas/core";

// Shared, mutable scene so `useScene()` returns the same object to VueNode
// (constructor), the compositor hook, and the test (which flips `playback.frame`
// to simulate scrubbing).
const sceneMock = vi.hoisted(() => {
  const handlers: Array<(args: [number, unknown]) => void> = [];
  return {
    afterReset: { subscribe: () => {} },
    onRenderLifecycle: { subscribe: (cb: (args: [number, unknown]) => void) => handlers.push(cb) },
    playback: { frame: 0 },
    handlers,
  };
});

vi.mock("@motion-canvas/core", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@motion-canvas/core")>();
  return {
    ...actual,
    useScene: vi.fn(() => sceneMock),
  };
});

// Mock MC's Node base class so VueNode can be instantiated without a live
// scene context (no PlaybackManager, no signal registry, etc.).
vi.mock("@motion-canvas/2d", () => {
  class Node {
    isClass = true;
    position() {
      return { x: 0, y: 0 };
    }
    scale() {
      return { x: 1, y: 1 };
    }
    rotation() {
      return 0;
    }
    opacity() {
      return 1;
    }
    absolutePosition() {
      return { x: 0, y: 0 };
    }
    absoluteScale() {
      return { x: 1, y: 1 };
    }
    absoluteRotation() {
      return 0;
    }
    absoluteOpacity() {
      return 1;
    }
    draw(_context: CanvasRenderingContext2D) {}
  }

  return { Node, Layout: Node };
});

const TestComponent = defineComponent({
  props: {
    title: String,
  },
  template: "<div>{{ title }}</div>",
});

// The compositor's bridge capture needs a 2D context with drawElement; jsdom's
// canvas has none, so provide a fake that always "captures" successfully.
const fakeBridgeContext = () => ({
  canvas: null as unknown as HTMLCanvasElement,
  clearRect: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  drawElement: vi.fn(() => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })),
  drawImage: vi.fn(),
});

const fakeRenderContext = () =>
  ({
    canvas: { width: 800, height: 450 },
    drawImage: vi.fn(),
  }) as unknown as CanvasRenderingContext2D;

describe("compositor backward-scrub flush", () => {
  let getContextSpy: ReturnType<typeof vi.spyOn>;
  let collectPromiseSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    const canvas = document.createElement("canvas");
    document.body.appendChild(canvas);
    getContextSpy = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(fakeBridgeContext() as never);
    collectPromiseSpy = vi.spyOn(DependencyContext, "collectPromise");
  });

  afterAll(() => {
    getContextSpy.mockRestore();
    collectPromiseSpy.mockRestore();
    document.querySelector("canvas")?.remove();
  });

  beforeEach(() => {
    // The compositor hook is installed once per scene object (WeakSet guard),
    // so `handlers[0]` persists across tests — only the simulated frame resets.
    sceneMock.playback.frame = 0;
    collectPromiseSpy.mockClear();
  });

  it("pins the one-flush lag: DOM updates only after a Vue nextTick", async () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "First" }) as any;
    await nextTick();

    sceneMock.playback.frame = 10;
    node.title("Second");
    (node as any)._syncDom();
    // The reactive write is queued, not committed: the DOM is still stale at the
    // moment the compositor would capture it.
    expect(node._positioner.textContent).toContain("First");

    await nextTick();
    expect(node._positioner.textContent).toContain("Second");
  });

  it("requests an extra render iteration on a backward frame jump", async () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "First" }) as any;
    await nextTick();

    const afterRender = sceneMock.handlers[0];
    expect(afterRender).toBeDefined();

    // Forward jump: single frame render captures stale DOM but does not retry.
    sceneMock.playback.frame = 10;
    node.title("Second");
    (node as any)._syncDom();
    afterRender([3, fakeRenderContext()]);
    expect(collectPromiseSpy).not.toHaveBeenCalled();
    // DOM is stale while the frame was being rendered.
    expect(node._positioner.textContent).toContain("First");
    await nextTick();
    expect(node._positioner.textContent).toContain("Second");

    // Backward jump: the compositor must request one extra render iteration so
    // the captured overlay reflects the scrubbed-to frame after Vue's flush.
    collectPromiseSpy.mockClear();
    sceneMock.playback.frame = 8;
    node.title("First");
    (node as any)._syncDom();
    afterRender([3, fakeRenderContext()]);
    expect(collectPromiseSpy).toHaveBeenCalledTimes(1);
    expect(collectPromiseSpy.mock.calls[0][0]).toBeInstanceOf(Promise);
    // The DOM the handler saw is still the later state — this is exactly the
    // frame the extra render iteration re-captures after the flush.
    expect(node._positioner.textContent).toContain("Second");
    await nextTick();
    expect(node._positioner.textContent).toContain("First");
  });

  it("does not re-request an extra render for the same backward frame", async () => {
    const Cls = defineVueNode(TestComponent);
    const node = new Cls({ title: "First" }) as any;
    await nextTick();

    const afterRender = sceneMock.handlers[0];

    sceneMock.playback.frame = 5;
    node.title("First");
    (node as any)._syncDom();
    afterRender([3, fakeRenderContext()]);
    // The retry iteration renders the same frame again — no new jump, no new request.
    sceneMock.playback.frame = 5;
    (node as any)._syncDom();
    afterRender([3, fakeRenderContext()]);
    expect(collectPromiseSpy).toHaveBeenCalledTimes(1);
  });
});

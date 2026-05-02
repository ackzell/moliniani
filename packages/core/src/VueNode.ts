// packages/core/src/VueNode.ts
import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import { useScene } from "@motion-canvas/core";
import gsap from "gsap";
import type { VueNodeConfig, MolinianiHandle } from "./types";
import { makeAnimatable } from "./bridge";

const BUILTIN_TRANSFORMS = {
  x: 0,
  y: 0,
  scale: 1,
  rotation: 0,
  opacity: 1,
} as const;

let nodeCounter = 0;

export class VueNode<P extends Record<string, any>> {
  private app: App | null = null;
  private container: HTMLElement | null = null;
  private exposed: Record<string, any> = {};
  private state: P;
  private readonly nodeId = `moliniani-node-${nodeCounter++}`;

  constructor(config: VueNodeConfig<P>) {
    this.state = reactive({ ...config.props }) as P;
    this.mount(config.component, config.props);
  }

  private mount(component: Component, initialProps: Record<string, any>): void {
    const existing = document.getElementById(this.nodeId);
    if (existing) existing.remove();

    this.container = document.createElement("div");
    this.container.id = this.nodeId;

    const canvas = document.querySelector("canvas");
    if (!canvas?.parentElement) {
      throw new Error("Motion Canvas canvas not found");
    }

    canvas.parentElement.appendChild(this.container);
    this.container.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      z-index: 9999;
      pointer-events: none;
    `;

    // apply initial transform values from props or defaults
    gsap.set(this.container, {
      x: initialProps.x ?? BUILTIN_TRANSFORMS.x,
      y: initialProps.y ?? BUILTIN_TRANSFORMS.y,
      scale: initialProps.scale ?? BUILTIN_TRANSFORMS.scale,
      rotation: initialProps.rotation ?? BUILTIN_TRANSFORMS.rotation,
      opacity: initialProps.opacity ?? BUILTIN_TRANSFORMS.opacity,
    });

    const state = this.state;
    this.app = createApp({
      render: () => h(component, state),
    });

    this.app.mount(this.container);

    const instance = this.app._instance;
    const child = instance?.subTree?.component;
    this.exposed = child?.exposed ?? {};

    const scene = useScene() as any;
    scene.afterReset.subscribe(() => {
      this.app?.unmount();
      this.container?.remove();
      this.app = null;
      this.container = null;
    });
  }

  getHandle(): MolinianiHandle<P> & Record<string, any> {
    const handle: any = {
      props: this.state,

      call: async (name: string, ...args: any[]) => {
        const fn = this.exposed[name];
        if (typeof fn !== "function") {
          throw new Error(`Method "${name}" is not exposed`);
        }
        return fn(...args);
      },

      unmount: () => {
        this.app?.unmount();
        this.container?.remove();
        this.app = null;
        this.container = null;
      },
    };

    // built-in transforms on the container element
    const container = this.container!;
    for (const key of Object.keys(BUILTIN_TRANSFORMS)) {
      handle[key] = makeAnimatable(container as unknown as Record<string, any>, key);
    }

    // numeric props — skip built-ins since they're on the container
    for (const key in this.state) {
      if (typeof this.state[key] === "number" && !(key in BUILTIN_TRANSFORMS)) {
        handle[key] = makeAnimatable(this.state, key);
      }
    }

    return handle;
  }
}

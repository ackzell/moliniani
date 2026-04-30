import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import { useScene } from "@motion-canvas/core";
import type { VueNodeConfig, MolinianiHandle } from "./types";
import { makeAnimatable } from "./bridge";

export class VueNode<P extends Record<string, any>> {
  private app: App | null = null;
  private container: HTMLElement | null = null;
  private exposed: Record<string, any> = {};
  private state: P;

  constructor(config: VueNodeConfig<P>) {
    this.state = reactive({ ...config.props }) as P;
    this.mount(config.component);
  }

  private mount(component: Component): void {
    this.container = document.createElement("div");

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

    this.app = createApp({
      render: () => h(component, this.state),
    });

    this.app.mount(this.container);

    const instance = this.app._instance;
    const child = instance?.subTree?.component;
    this.exposed = child?.exposed ?? {};

    // clean up when MC resets the scene
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

    for (const key in this.state) {
      if (typeof this.state[key] === "number") {
        handle[key] = makeAnimatable(this.state, key);
      }
    }

    return handle;
  }
}

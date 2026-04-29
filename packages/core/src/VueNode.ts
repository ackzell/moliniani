import { createApp, h, reactive, type App, type Component } from "@vue/runtime-dom";
import type { MolinianiHandle, VueNodeConfig } from "./types";

export class VueNode<P extends Record<string, unknown>> {
  private app: App | null = null;
  private container: HTMLElement | null = null;
  private exposedRef: Record<string, unknown> = {};
  private reactiveProps: P;

  public constructor(config: VueNodeConfig<P>) {
    this.reactiveProps = reactive({ ...config.props }) as P;

    this.mount(config.component);
  }

  private mount(component: Component): void {
    this.container = document.createElement("div");
    document.body.appendChild(this.container);

    // wrap in a render function so reactiveProps stays live
    const wrapper = {
      render: () => {
        return h(component, this.reactiveProps);
      },
    };

    this.app = createApp(wrapper);
    this.app.mount(this.container);

    // exposed is on the child, not the wrapper
    const instance = this.app._instance;
    const child = instance?.subTree?.component;
    this.exposedRef = child?.exposed ?? {};
  }

  public getHandle(): MolinianiHandle<P> {
    return {
      props: this.reactiveProps,

      call: async <T>(method: string, ...args: unknown[]): Promise<T> => {
        const fn = this.exposedRef[method];
        if (typeof fn !== "function") {
          throw new Error(`Moliniani: method "${method}" is not exposed by this component`);
        }
        return fn(...args) as Promise<T>;
      },

      unmount: () => {
        this.app?.unmount();
        this.container?.remove();
        this.app = null;
        this.container = null;
      },
    };
  }
}

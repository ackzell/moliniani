import { createApp, type App, type Component } from "@vue/runtime-dom";
import type { MolinianiHandle, VueNodeConfig } from "./types";

export class VueNode<P extends Record<string, unknown>> {
  private app: App | null = null;
  private container: HTMLElement | null = null;
  private exposedRef: Record<string, unknown> = {};
  private reactiveProps: P;

  public constructor(config: VueNodeConfig<P>) {
    this.reactiveProps = { ...config.props };
    this.mount(config.component);
  }

  private mount(component: Component): void {
    this.container = document.createElement("div");
    document.body.appendChild(this.container);

    this.app = createApp(component, this.reactiveProps);
    this.app.mount(this.container);

    const instance = this.app._instance;
    this.exposedRef = instance?.exposed ?? {};
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

import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import type { DefineComponent } from "vue";
import TypewriterSfc from "./Typewriter.gen";

export interface TypewriterProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  cursorColor?: string;
  cursorWidth?: number;
  cursorBlinkSpeed?: number;
}

// tsgo cannot resolve the `ComponentInstance<C>["$props"]` conditional that
// `defineVueNode` uses internally, so pin the props type explicitly.
const TypewriterSfcTyped = TypewriterSfc as unknown as DefineComponent<any, any, any>;

export const Typewriter: VueNodeConstructor<TypewriterProps> = defineVueNode(
  TypewriterSfcTyped,
  "Typewriter",
);

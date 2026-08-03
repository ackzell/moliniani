import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import type { DefineComponent } from "vue";
import TypewriterSfc from "./Typewriter.gen";
import ScrambleTextSfc from "./ScrambleText.gen";
import GlowTextSfc from "./GlowText.gen";

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

export interface ScrambleTextProps {
  text?: string;
  chars?: string;
  override?: string | boolean;
  ease?: string;
  from?: string | number;
  reversed?: boolean;
  cursor?: string | number | boolean;
  perturbation?: number;
  seed?: number;
  revealRate?: number;
  settleRate?: number;
  settleDuration?: number;
  revealDelay?: number;
  delay?: number;
  duration?: number;
  progress?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

const ScrambleTextSfcTyped = ScrambleTextSfc as unknown as DefineComponent<any, any, any>;

export const ScrambleText: VueNodeConstructor<ScrambleTextProps> = defineVueNode(
  ScrambleTextSfcTyped,
  "ScrambleText",
);

export interface GlowTextProps {
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  glowColor?: string;
  glowRadius?: number;
  progress?: number;
}

const GlowTextSfcTyped = GlowTextSfc as unknown as DefineComponent<any, any, any>;

export const GlowText: VueNodeConstructor<GlowTextProps> = defineVueNode(
  GlowTextSfcTyped,
  "GlowText",
);

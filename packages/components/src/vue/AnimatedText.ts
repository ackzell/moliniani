// packages/components/src/vue/AnimatedText.ts
import { defineVueNode, type VueNodeConstructor } from "@moliniani/core";
import { textEffectExtend } from "../textEffectNode";
import type { TextEffectProps, TextEffectSpec } from "../textEffects";
import type { DefineComponent } from "vue";
import AnimatedTextSfc from "./AnimatedText.gen";

/**
 * Instance members `AnimatedText` exposes on the Motion Canvas node via
 * `defineVueNode()`'s `extend` factory. `effect` is the active
 * `TextEffectSpec` — `createPhraseSwitcher(ref)` reads it to derive the
 * default enter/exit lengths, so a scene names the effect once instead of
 * pairing a component with a separate spec import.
 */
export interface AnimatedTextInstance {
  readonly effect: TextEffectSpec;
}

/** Props for `<AnimatedText>`. `effect` is the catalog spec that drives it. */
export interface AnimatedTextProps extends TextEffectProps {
  effect: TextEffectSpec;
  text?: string;
  /** Split unit override (`chars` / `words` / `lines`); defaults to the effect's target. */
  split?: string;
  phase?: number;
  exit?: number;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
}

const AnimatedTextSfcTyped = AnimatedTextSfc as unknown as DefineComponent<any, any, any>;

export const AnimatedText: VueNodeConstructor<AnimatedTextProps, AnimatedTextInstance> =
  defineVueNode(
    AnimatedTextSfcTyped,
    "AnimatedText",
    textEffectExtend(
      (node) => (node as { effect?: TextEffectSpec }).effect?.target !== "whole",
      "effect",
    ) as (
      Base: VueNodeConstructor<AnimatedTextProps>,
    ) => VueNodeConstructor<AnimatedTextProps, AnimatedTextInstance>,
  );

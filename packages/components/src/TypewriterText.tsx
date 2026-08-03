import { Rect, Txt, Node, type NodeProps, initial, signal } from "@motion-canvas/2d";
import {
  type SignalValue,
  type SimpleSignal,
  linear,
  loop,
  cancel,
  waitFor,
  spawn,
  type ThreadGenerator,
  type TimingFunction,
} from "@motion-canvas/core";

export interface TypewriterTextProps extends NodeProps {
  text?: SignalValue<string>;
  fontSize?: SignalValue<number>;
  fill?: SignalValue<string>;
  fontFamily?: SignalValue<string>;
  cursorWidth?: SignalValue<number>;
  cursorHeight?: SignalValue<number>;
  cursorColor?: SignalValue<string>;
  cursorBlinkSpeed?: SignalValue<number>;
  cursorOffset?: SignalValue<number>;
}

export interface TypewriterTypeOptions {
  easing?: TimingFunction;
  autoHideAfter?: number;
  autoHideFade?: number;
}

export class TypewriterText extends Node {
  @initial("")
  @signal()
  declare public readonly text: SimpleSignal<string, this>;

  @initial(44)
  @signal()
  declare public readonly fontSize: SimpleSignal<number, this>;

  @initial("#ffffff")
  @signal()
  declare public readonly fill: SimpleSignal<string, this>;

  @initial("monospace")
  @signal()
  declare public readonly fontFamily: SimpleSignal<string, this>;

  @initial(24)
  @signal()
  declare public readonly cursorWidth: SimpleSignal<number, this>;

  @initial(44)
  @signal()
  declare public readonly cursorHeight: SimpleSignal<number, this>;

  @initial("#ffffff")
  @signal()
  declare public readonly cursorColor: SimpleSignal<string, this>;

  @initial(0.5)
  @signal()
  declare public readonly cursorBlinkSpeed: SimpleSignal<number, this>;

  @initial(4)
  @signal()
  declare public readonly cursorOffset: SimpleSignal<number, this>;

  private cursor: Rect;
  private blinkTask: ThreadGenerator | null = null;

  public constructor(props?: TypewriterTextProps) {
    super(props ?? {});

    this.cursor = (
      <Rect
        width={() => this.cursorWidth()}
        height={() => this.cursorHeight()}
        fill={() => this.cursorColor()}
        opacity={0}
        y={() => (this.fontSize() - this.cursorHeight()) / 2}
      />
    ) as Rect;

    this.cursor.x(() => (this.text().length * this.fontSize() * 0.63) / 2 + this.cursorOffset());

    this.add(
      <>
        <Txt
          text={() => this.text()}
          fontSize={() => this.fontSize()}
          fill={() => this.fill()}
          fontFamily={() => this.fontFamily()}
          textAlign="left"
        />
        {this.cursor}
      </>,
    );
  }

  public *type(
    fullText: string,
    duration: number,
    options?: TypewriterTypeOptions,
  ): ThreadGenerator {
    this.text("");
    this.cursorColor(this.fill());
    this.cursor.opacity(1);
    yield* this.text(fullText, duration, options?.easing ?? linear);

    spawn(this.blinkThenHide(options));
  }

  private *blinkThenHide(options?: TypewriterTypeOptions): ThreadGenerator {
    yield* this.startBlink();
    const hideAfter = options?.autoHideAfter ?? 1.2;
    if (hideAfter >= 0) {
      yield* waitFor(hideAfter);
      yield* this.stop(options?.autoHideFade);
    }
  }

  private *blinkOnce(): ThreadGenerator {
    yield* this.cursor.opacity(0, this.cursorBlinkSpeed());
    yield* this.cursor.opacity(1, this.cursorBlinkSpeed());
  }

  public *startBlink(): ThreadGenerator {
    if (this.blinkTask) {
      cancel(this.blinkTask);
    }
    this.cursor.opacity(1);
    this.blinkTask = yield loop(Infinity, () => this.blinkOnce());
  }

  public *stop(fadeDuration: number = 0.15): ThreadGenerator {
    if (this.blinkTask) {
      cancel(this.blinkTask);
      this.blinkTask = null;
    }
    yield* this.cursor.opacity(0, fadeDuration);
  }
}

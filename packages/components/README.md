# @moliniani/components

Ready-made Motion Canvas nodes and pre-wrapped Vue SFCs for `@moliniani/core`.

## What it provides

- **`TypewriterText`** (root entry) — a native MC node that types text into
  `Txt`, with a blinking cursor. Animate with `yield* nodeRef().type("...", 1.5)`.
- **`Typewriter`** (`./vue` entry) — the same effect shipped as a pre-wrapped
  Vue SFC. Use it in a scene with `mn(Typewriter, ref, { text, fontSize, color })`
  and tween its props like any MC signal.

```tsx
import { TypewriterText } from "@moliniani/components";
import { Typewriter } from "@moliniani/components/vue";
import { mn, createMnRef } from "@moliniani/core";

const twRef = createRef<TypewriterText>();
const vueRef = createMnRef(Typewriter);

view.add(
  <>
    <TypewriterText ref={twRef} text="" fontSize={36} fill="#ffd166" />
    {mn(Typewriter, vueRef, { text: "Vue typewriter", fontSize: 36, y: -250 })}
  </>,
);

yield * twRef().type("Native TypewriterText", 1.5);
yield * vueRef().text("Vue <Typewriter>", 1.5);
```

## Generated SFCs

The pre-wrapped SFCs under `./vue` are compiled from the `.vue` sources in
`src/vue` into `src/vue/*.gen.ts` by `scripts/compile-vue.mjs`:

```bash
pnpm gen        # regenerate (also runs automatically before build/test/check)
```

Never hand-edit the `*.gen.ts` files; edit the `.vue` sources instead.

# @moliniani/utils

Framework-free helpers for animating Motion Canvas nodes. No Vue involved.

## What it provides

- **`revealText(node, duration, easing?)`** — reveals a `Txt` node's text
  character by character on the MC timeline. Also re-exported from
  `@moliniani/core` for back-compat.
- **`graphemes(text)`** — splits a string into Unicode code points (handles
  surrogate pairs / astral characters).
- **`floatIt(node, { amplitude, period, phase })`** — bobs a node up and down on
  the virtual timeline forever.

```tsx
import { revealText } from "@moliniani/utils";
import { floatIt } from "@moliniani/utils";

yield * revealText(label(), 1.5);
yield * floatIt(badge(), { amplitude: 20, period: 2 });
```

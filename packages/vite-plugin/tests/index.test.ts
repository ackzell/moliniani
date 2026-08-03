import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { moliniani, extractPropsType } from "../src/index.js";

describe("extractPropsType", () => {
  it("extracts a simple defineProps literal", () => {
    const src =
      '<script setup lang="ts">\ndefineProps<{ label?: string; width?: number }>();\n</script>';
    expect(extractPropsType(src)).toBe("{ label?: string; width?: number }");
  });

  it("handles withDefaults", () => {
    const src =
      '<script setup lang="ts">\nwithDefaults(defineProps<{ width?: number; active?: boolean }>(), { width: 100 });\n</script>';
    expect(extractPropsType(src)).toBe("{ width?: number; active?: boolean }");
  });

  it("handles string-literal unions", () => {
    const src = '<script setup lang="ts">\ndefineProps<{ color?: "red" | "blue" }>();\n</script>';
    expect(extractPropsType(src)).toBe('{ color?: "red" | "blue" }');
  });

  it("returns undefined for referenced or complex types", () => {
    const cases = [
      '<script setup lang="ts">\ninterface Props { label?: string }\ndefineProps<Props>();\n</script>',
      '<script setup lang="ts">\ndefineProps<{ items: Array<string> }>();\n</script>',
      '<script setup lang="ts">\ndefineProps<{ data: { a: number } }>();\n</script>',
      '<script setup lang="ts">\ndefineProps<{ onTick?: (t: number) => void }>();\n</script>',
      '<script setup lang="ts">\ndefineProps<{ sizes?: number[] }>();\n</script>',
    ];
    for (const src of cases) {
      expect(extractPropsType(src)).toBeUndefined();
    }
  });

  it("returns undefined when there are no props", () => {
    expect(extractPropsType('<script setup lang="ts">\nconst x = 1;\n</script>')).toBeUndefined();
  });
});

describe("moliniani() transform", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "mn-plugin-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  function run(code: string, id: string, importers: string[] = []) {
    const plugin = moliniani();
    return (plugin.transform as any).call({ getModuleInfo: () => ({ importers }) }, code, id);
  }

  it("wraps the default export with defineVueNode and emits a typed d.ts", () => {
    const id = path.join(dir, "MyBox.vue");
    writeFileSync(
      id,
      '<script setup lang="ts">\ndefineProps<{ label?: string; width?: number }>();\n</script>',
    );
    const code = `import { defineComponent } from 'vue';\nconst __sfc__ = defineComponent({});\nexport default __sfc__;\n`;

    const result = run(code, id);

    expect(result).not.toBeNull();
    expect((result as any).code).toContain("defineVueNode");
    expect((result as any).code).toContain('__mn_defineVueNode(__mn_sfc_default, "MyBox")');

    const dts = readFileSync(id + ".d.ts", "utf-8");
    expect(dts).toContain("VueNodeConstructor<{ label?: string; width?: number }>");
  });

  it("wraps Tres-named SFCs with defineTresNode", () => {
    const id = path.join(dir, "TresBox.vue");
    const code = `const __sfc__ = {};\nexport default __sfc__;\n`;

    const result = run(code, id);

    expect((result as any).code).toContain("defineTresNode");
  });

  it("leaves .vue modules imported by another .vue file untouched", () => {
    const id = path.join(dir, "Child.vue");
    const code = `const __sfc__ = {};\nexport default __sfc__;\n`;

    const result = run(code, id, [path.join(dir, "Parent.vue")]);

    expect(result).toBeNull();
  });
});

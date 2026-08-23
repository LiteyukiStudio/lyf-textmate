import { cp, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const output = join(root, "dist");
await mkdir(output, { recursive: true });
await cp(join(root, "src", "grammar.json"), join(output, "grammar.json"));
await cp(
  join(root, "node_modules", "vscode-oniguruma", "release", "onig.wasm"),
  join(output, "onig.wasm"),
);

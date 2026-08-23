import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  createLyfTokenizer,
  LyfTokenizerError,
  lyfThemeToken,
  type LyfTokenDocument
} from "../src/index.js";

const wasm = async () => readFile(fileURLToPath(new URL("../node_modules/vscode-oniguruma/release/onig.wasm", import.meta.url)));

async function tokenize(source: string, options = {}) {
  const tokenizer = await createLyfTokenizer({ wasm, ...options });
  try {
    return tokenizer.tokenize(source);
  } finally {
    tokenizer.dispose();
  }
}

function scopes(document: LyfTokenDocument): string[] {
  return document.lines.flatMap((line) => line.tokens.flatMap((token) => token.scopes));
}

describe("LYF tokenizer", () => {
  it("tokenizes v7 declarations, decorators, literals, comments, and calls", async () => {
    const document = await tokenize([
      "@version 1.0",
      "/// greeting",
      '@agent(tool, name="say")',
      "fn greet(name) {",
      '  let answer = terminal.echo("hello {name}") # safe',
      "  return {value: answer, ok: true}",
      "}"
    ].join("\n"));
    const allScopes = scopes(document);
    expect(document.lines).toHaveLength(7);
    expect(allScopes).toContain("keyword.control.directive.lyf");
    expect(allScopes).toContain("comment.line.documentation.lyf");
    expect(allScopes).toContain("meta.annotation.lyf");
    expect(allScopes).toContain("entity.name.function.lyf");
    expect(allScopes).toContain("string.quoted.double.lyf");
    expect(allScopes).toContain("constant.language.lyf");
    expect(allScopes).toContain("support.function.call.lyf");
  });

  it("keeps token output as text ranges instead of HTML", async () => {
    const document = await tokenize('<img src=x> & {user}');
    expect(document.lines[0]?.text).toBe('<img src=x> & {user}');
    expect(document.lines[0]?.tokens.every((token) => token.startIndex <= token.endIndex)).toBe(true);
    expect(JSON.stringify(document)).not.toContain("<span");
  });

  it("enforces source limits and cancellation", async () => {
    const tokenizer = await createLyfTokenizer({ wasm, limits: { maxSourceBytes: 4, maxLines: 2 } });
    expect(() => tokenizer.tokenize("12345")).toThrowError(LyfTokenizerError);
    expect(() => tokenizer.tokenize("a\nb\nc")).toThrowError(LyfTokenizerError);
    const controller = new AbortController();
    controller.abort();
    expect(() => tokenizer.tokenize("a", { signal: controller.signal })).toThrowError(LyfTokenizerError);
    tokenizer.dispose();
  });

  it("releases the tokenizer and rejects subsequent use", async () => {
    const tokenizer = await createLyfTokenizer({ wasm });
    tokenizer.dispose();
    expect(() => tokenizer.tokenize("pass")).toThrowError(/disposed/);
  });

  it("maps known scopes to stable light and dark theme tokens", () => {
    expect(lyfThemeToken(["source.lyf", "keyword.control.lyf"], "light").fontStyle).toBe("bold");
    expect(lyfThemeToken(["source.lyf", "string.quoted.double.lyf"], "dark").foreground).toBe("#86efac");
  });
});

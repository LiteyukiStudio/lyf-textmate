import textmate from "vscode-textmate";
import type { IGrammar, IRawGrammar } from "vscode-textmate";
import oniguruma from "vscode-oniguruma";

import grammarDocument from "./grammar.json" with { type: "json" };

const { Registry, parseRawGrammar } = textmate;
const { loadWASM, OnigScanner, OnigString } = oniguruma;

export { LYF_THEME_TOKENS, lyfThemeToken, type LyfThemeName, type LyfThemeToken } from "./themes.js";

export const LYF_SCOPE_NAME = "source.lyf" as const;

export type LyfToken = {
  startIndex: number;
  endIndex: number;
  scopes: readonly string[];
};

export type LyfTokenLine = {
  text: string;
  tokens: readonly LyfToken[];
};

export type LyfTokenDocument = {
  lines: readonly LyfTokenLine[];
  sourceBytes: number;
  tokenCount: number;
};

export type LyfLimits = {
  maxSourceBytes: number;
  maxLines: number;
  maxLineLength: number;
  maxTokens: number;
};

export type LyfWasmSource =
  | ArrayBuffer
  | Uint8Array
  | (() => Promise<ArrayBuffer | Uint8Array>);

export type LyfTokenizerOptions = {
  wasm?: LyfWasmSource;
  limits?: Partial<LyfLimits>;
};

export type LyfTokenizeOptions = {
  signal?: AbortSignal;
};

export const DEFAULT_LYF_LIMITS: Readonly<LyfLimits> = {
  maxSourceBytes: 256 * 1024,
  maxLines: 4096,
  maxLineLength: 8192,
  maxTokens: 100_000
};

export type LyfTokenizerErrorCode = "disposed" | "source_limit" | "line_limit" | "token_limit" | "cancelled";

export class LyfTokenizerError extends Error {
  readonly code: LyfTokenizerErrorCode;

  constructor(code: LyfTokenizerErrorCode, message: string) {
    super(message);
    this.name = "LyfTokenizerError";
    this.code = code;
  }
}

export type LyfTokenizer = {
  tokenize(source: string, options?: LyfTokenizeOptions): LyfTokenDocument;
  dispose(): void;
};

let wasmLoad: Promise<void> | undefined;

export async function loadLyfGrammar(): Promise<IRawGrammar> {
  return parseRawGrammar(JSON.stringify(grammarDocument), "lyf.tmLanguage.json");
}

export async function createLyfTokenizer(options: LyfTokenizerOptions = {}): Promise<LyfTokenizer> {
  if (!wasmLoad) wasmLoad = initializeOniguruma(options.wasm);
  await wasmLoad;
  const registry = new Registry({
    onigLib: Promise.resolve({
      createOnigScanner(patterns: string[]) {
        return new OnigScanner(patterns);
      },
      createOnigString(value: string) {
        return new OnigString(value);
      }
    }),
    loadGrammar: loadLyfGrammar
  });
  const grammar = await registry.loadGrammar(LYF_SCOPE_NAME);
  if (!grammar) throw new Error("LYF TextMate grammar could not be loaded");
  const limits: LyfLimits = { ...DEFAULT_LYF_LIMITS, ...options.limits };
  return createTokenizer(grammar, limits);
}

function createTokenizer(grammar: IGrammar, limits: LyfLimits): LyfTokenizer {
  let disposed = false;

  return {
    tokenize(source, options = {}) {
      if (disposed) throw new LyfTokenizerError("disposed", "LYF tokenizer has been disposed");
      const sourceBytes = new TextEncoder().encode(source).byteLength;
      if (sourceBytes > limits.maxSourceBytes) {
        throw new LyfTokenizerError("source_limit", "LYF source exceeds the configured byte limit");
      }
      const lines = source.replace(/\r\n?/g, "\n").split("\n");
      if (lines.length > limits.maxLines) {
        throw new LyfTokenizerError("line_limit", "LYF source exceeds the configured line limit");
      }
      let ruleStack = null;
      let tokenCount = 0;
      const tokenLines: LyfTokenLine[] = [];
      for (const line of lines) {
        if (options.signal?.aborted) throw new LyfTokenizerError("cancelled", "LYF tokenization was cancelled");
        if (line.length > limits.maxLineLength) {
          throw new LyfTokenizerError("line_limit", "LYF source contains a line longer than the configured limit");
        }
        const result = grammar.tokenizeLine(line, ruleStack ?? null);
        ruleStack = result.ruleStack;
        const tokens: LyfToken[] = result.tokens.map((token, index) => {
          const next = result.tokens[index + 1];
          return Object.freeze({
            startIndex: token.startIndex,
            endIndex: next?.startIndex ?? line.length,
            scopes: Object.freeze([...token.scopes])
          });
        });
        tokenCount += tokens.length;
        if (tokenCount > limits.maxTokens) {
          throw new LyfTokenizerError("token_limit", "LYF source exceeds the configured token limit");
        }
        tokenLines.push(Object.freeze({ text: line, tokens: Object.freeze(tokens) }));
      }
      return Object.freeze({ lines: Object.freeze(tokenLines), sourceBytes, tokenCount });
    },
    dispose() {
      disposed = true;
      grammar = undefined as unknown as IGrammar;
    }
  };
}

async function initializeOniguruma(source?: LyfWasmSource): Promise<void> {
  const data = await resolveWasm(source);
  await loadWASM(data as ArrayBuffer);
}

async function resolveWasm(source?: LyfWasmSource): Promise<ArrayBuffer | Uint8Array> {
  if (typeof source === "function") return source();
  if (source) return source;
  const url = new URL("./onig.wasm", import.meta.url);
  if (url.protocol === "file:") {
    const fs = (globalThis as {
      process?: { getBuiltinModule?: (specifier: string) => unknown };
    }).process?.getBuiltinModule?.("node:fs/promises") as
      | { readFile(path: URL): Promise<Uint8Array> }
      | undefined;
    if (!fs) throw new Error("LYF tokenizer needs a WASM loader in this environment");
    const bytes = await fs.readFile(url);
    return bytes;
  }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load LYF Oniguruma WASM: ${response.status}`);
  return response.arrayBuffer();
}

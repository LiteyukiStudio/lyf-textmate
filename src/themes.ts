export type LyfThemeName = "light" | "dark";

export type LyfThemeToken = {
  foreground: string;
  fontStyle?: "bold" | "italic" | "underline";
};

export const LYF_THEME_TOKENS: Readonly<Record<LyfThemeName, Readonly<Record<string, LyfThemeToken>>>> = {
  light: {
    default: { foreground: "#263238" },
    comment: { foreground: "#66737b", fontStyle: "italic" },
    keyword: { foreground: "#7c3aed", fontStyle: "bold" },
    storage: { foreground: "#b42318", fontStyle: "bold" },
    string: { foreground: "#087f5b" },
    constant: { foreground: "#9a3412" },
    number: { foreground: "#9a3412" },
    function: { foreground: "#075985" },
    variable: { foreground: "#334155" },
    invalid: { foreground: "#b42318", fontStyle: "underline" },
    punctuation: { foreground: "#52606d" }
  },
  dark: {
    default: { foreground: "#e5edf2" },
    comment: { foreground: "#94a3ad", fontStyle: "italic" },
    keyword: { foreground: "#c4b5fd", fontStyle: "bold" },
    storage: { foreground: "#fda4af", fontStyle: "bold" },
    string: { foreground: "#86efac" },
    constant: { foreground: "#fdba74" },
    number: { foreground: "#fdba74" },
    function: { foreground: "#7dd3fc" },
    variable: { foreground: "#cbd5e1" },
    invalid: { foreground: "#fda4af", fontStyle: "underline" },
    punctuation: { foreground: "#a8b6c1" }
  }
} as const;

export function lyfThemeToken(scopes: readonly string[], theme: LyfThemeName): LyfThemeToken {
  const names = LYF_THEME_TOKENS[theme];
  for (const scope of [...scopes].reverse()) {
    const family = scope.split(".")[0];
    if (family && names[family]) return names[family];
    if (scope.startsWith("invalid.") && names.invalid) return names.invalid;
    if (scope.startsWith("punctuation.") && names.punctuation) return names.punctuation;
  }
  return names.default!;
}

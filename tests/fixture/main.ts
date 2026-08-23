import { createLyfTokenizer } from "@liteyuki/lyf-textmate";

const tokenizer = await createLyfTokenizer();
const result = tokenizer.tokenize("@version 1.0\nfn main() { pass }");
document.querySelector("#app")!.textContent = `${result.lines.length}:${result.tokenCount}`;
tokenizer.dispose();

# LYF TextMate

Framework-neutral ESM tokenization for Liteyuki Function (LYF) source.

The package returns bounded text ranges and TextMate scopes. It never returns
HTML and does not execute or parse LYF. Consumers choose how known scopes are
rendered.

```ts
import { createLyfTokenizer } from "@liteyuki/lyf-textmate";

const tokenizer = await createLyfTokenizer();
const document = tokenizer.tokenize('@version 1.0\nfn main() { pass }');
tokenizer.dispose();
```

The grammar follows the v7 LYF specification in LiteyukiBot. Source limits,
abort signals, and disposal are part of the public contract.

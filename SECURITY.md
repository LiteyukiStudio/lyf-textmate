# Security Policy

Please report security issues privately through GitHub Security Advisories for
this repository. Do not include credentials, private source, or executable
artifacts in a public issue.

The tokenizer is intentionally bounded and read-only. It must not execute LYF,
evaluate interpolation, return HTML, or retain unbounded source/token trees.

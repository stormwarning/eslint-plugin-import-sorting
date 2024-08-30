---
'eslint-plugin-import-sorting': minor
---

Include Bun runtime modules in `builtin` group
Since some builtin modules require a `bun:` or `node:` protocol prefix while others do not, sorting ignores the protocol prefix. (Including it consistently is recommended)

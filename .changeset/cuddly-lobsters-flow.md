---
'eslint-plugin-import-sorting': patch
---

Fix local import sort order when dot segment count is the same
Sorting will now take the entire path into account, instead of just the basename of the path.

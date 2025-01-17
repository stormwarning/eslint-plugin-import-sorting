# eslint-plugin-import-sorting

## 2.1.2

### Patch Changes

- Fix semicolons being added to end of import specifiers after sorting ([#29](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/29))

## 2.1.1

### Patch Changes

- Fix bug with grouping when settings are not explicitly defined ([#27](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/27))

## 2.1.0

### Minor Changes

- Add new `specifier-order` rule for sorting named imports ([#25](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/25))

## 2.0.0

### Major Changes

- Remove deprecated settings ([#18](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/18))

  - `import-sorting/known-framework` should be changed to `import-sorting/framework-patterns`
  - `import-sorting/known-first-party` should be changed to `import-sorting/internal-patterns`

### Minor Changes

- Group unassigned imports at the top ([#18](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/18))
  Unassigned imports are grouped together, but not sorted in case of potential side-effects.
- Include Bun runtime modules in `builtin` group ([#18](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/18))
  Since some builtin modules require a `bun:` or `node:` protocol prefix while others do not, sorting ignores the protocol prefix. (Including it consistently is recommended)
- Include additional extensions in `style` group ([#18](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/18))
  The `style` group now matches imports of Less, Sass, Stylus, and more.

## 1.2.2

### Patch Changes

- Export ESM and types ([#21](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/21))
  Plugin is exported as ESM and CJS, and includes type declarations as well.

## 1.2.1

### Patch Changes

- Deprecate plugin settings ([#19](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/19))
  The next major version of the plugin will use

  - `import-sorting/framework-patterns` instead of `known-framework`
  - `import-sorting/internal-patterns` instead of `known-first-party`

## 1.2.0

### Minor Changes

- Allow array values for plugin settings ([#14](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/14))
  Settings options now accept an array of pattern strings, instead of only a single, more convoluted, RegExp string.
  Closes #8

## 1.1.0

### Minor Changes

- Sort numerals in path strings naturally ([#11](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/11))
  Now ensures that `10` will sort after `2`, for example.

### Patch Changes

- Fix local import sort order when dot segment count is the same ([#11](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/11))
  Sorting will now take the entire path into account, instead of just the basename of the path.
- Add `engines` key to indicate minimum Node version ([#12](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/12))

## 1.0.3

### Patch Changes

- Fix error when plugin settings are undefined ([#9](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/9))

## 1.0.2

### Patch Changes

- Update export and build strategy ([#6](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/6))

  Should fix issues with plugin being unable to load, or rule definitions not being found.

## 1.0.1

### Patch Changes

- Add guard against non-string `settings` values ([#3](https://github.com/stormwarning/eslint-plugin-import-sorting/pull/3))  
  Thanks [@jakubpelczarclari](https://github.com/jakubpelczarclari)!

## 1.0.0

### Major Changes

- **Initial release 🎉** [`55c18d1`](https://github.com/stormwarning/eslint-plugin-import-sorting/commit/55c18d18e70c90d9495996d8adaf22db25a5214f)

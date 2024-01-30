# eslint-plugin-import-sorting

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

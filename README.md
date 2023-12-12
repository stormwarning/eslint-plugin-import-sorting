## eslint-plugin-import-sorting

Enforce a convention in the order of `import` statements, inspired by [isort](https://timothycrosley.github.io/isort/#how-does-isort-work)’s grouping style:

1. Node standard modules
2. Framework modules
3. Third-party modules
4. First-party modules
5. Explicitly local modules

This plugin includes an additional group for “style” imports where the import source ends in `.css` or other style format. Imports are sorted alphabetically, except for local modules, which are sorted by the number of `.` segements in the path first, then alphabetically.

## Usage

```js
rules: {
	'import-sorting/sort-imports': 'error',
}
```

See the [sort-imports](https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/sort-imports.md) docs for more configuration options.

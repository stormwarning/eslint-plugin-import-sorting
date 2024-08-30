# import-sorting/order

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

Enforce a convention in the order of `import` statements.

The grouping order is as follows:

1. Unassigned imports (only grouped, existing order is preserved)
2. Node/Bun standard modules (protocol is ignored when sorting)
3. Framework modules (see below)
4. External modules
5. Internal modules (see below)
6. Explicitly local modules (paths starting with a dot segment)
7. Style imports

## Settings

The framework and internal groups can be configured by passing a RegEx
string to the different plugin setting. This allows the rule itself to be
implemented by a shared config, while individual projects can determine what
constitutes an “internal” module.

For example:

```js
settings: {
	// Group official React packages together.
	'import-sorting/framework-patterns': /^react(\/|-dom|-router|$)/.source,
	// Group aliased imports together.
	'import-sorting/internal-patterns': /^~/.source,
},
rules: {
	'import-sorting/order': 'error',
},
```

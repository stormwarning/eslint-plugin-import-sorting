# import-sorting/order

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

Enforce a convention in the order of `import` statements.

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

# import-sorting/order

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

Enforce a convention in the order of `import` statements.

## Settings

The framework and first-party groups can be configured by passing a RegEx
string to the different plugin setting. This allows the rule itself to be
implemented by a shared config, while individual projects can determine what
constitutes a “first-party” module.

For example:

```js
settings: {
	// Group official React packages together.
	'import-sorting/known-framework': /^react(\/|-dom|-router|$)/.source,
	// Group aliased imports together.
	'import-sorting/known-first-party': /^~/.source,
},
rules: {
	'import-sorting/order': 'error',
},
```

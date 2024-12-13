# Consistently order named import specifiers (`import-sorting/specifier-order`)

🔧 This rule is automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/latest/user-guide/command-line-interface#--fix).

<!-- end auto-generated rule header -->

Specifiers are sorted naturally, the same as imports within groups. `type` 
keywords are ignored during sorting.

```js
export default [
	{
		rules: {
			'import-sorting/specifier-order': 'error',
		},
	},
]
```

## eslint-plugin-import-sorting

Enforce a convention in the order of `import` statements, inspired by [isort](https://timothycrosley.github.io/isort/#how-does-isort-work)’s grouping style:

1. Node standard modules
2. Framework modules
3. External modules
4. Internal modules
5. Explicitly local modules

This plugin includes an additional group for “style” imports where the import source ends in `.css` or other style format. Imports are sorted alphabetically, except for local modules, which are sorted by the number of `.` segements in the path first, then alphabetically.

## Usage

Install the plugin, and ESLint if is not already.

```sh
npm install --save-dev eslint eslint-plugin-import-sorting
```

Include the plugin in the `plugins` key of your ESLint config and enable the rule.

```js
// eslint.config.js

import importSortingPlugin from 'eslint-plugin-import-sorting'

export default [
	{
		plugins: {
			'import-sorting': importSortingPlugin,
		},
		rules: {
			'import-sorting/order': 'warn',
		},
	},
]
```

<details>
	<summary>Legacy config example</summary>

```js
// .eslintrc.js

module.exports = {
	plugins: ['import-sorting'],
	rules: {
		'import-sorting/order': 'warn',
	},
}
```

</details>

See the [order](https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/order.md) rule docs for more configuration options.

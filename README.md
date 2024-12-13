# eslint-plugin-import-sorting

Enforce a convention in the order of `import` statements, inspired by 
[isort](https://timothycrosley.github.io/isort/#how-does-isort-work)’s grouping style:

1. Node standard modules
2. Framework modules
3. External modules
4. Internal modules
5. Explicitly local modules

This plugin includes an additional group for “style” imports where the import
source ends in `.css` or other style format. Imports are sorted alphabetically,
except for local modules, which are sorted by the number of `.` segements in
the path first, then alphabetically.

## Usage

Install the plugin, and ESLint if it is not already.

```sh
npm install --save-dev eslint eslint-plugin-import-sorting
```

Include the plugin in the `plugins` key of your ESLint config and enable the
rules.

```js
// eslint.config.js

import importSortingPlugin from 'eslint-plugin-import-sorting'

export default [
	{
		plugins: {
			'import-sorting': importSortingPlugin,
		},
		rules: {
			'import-sorting/order': 'error',
		},
	},
]
```

<!-- begin auto-generated rules list -->

🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).

| Name                                             | Description                                 | 🔧 |
| :----------------------------------------------- | :------------------------------------------ | :- |
| [order](docs/rules/order.md)                     | Consistently order `import` statements.     | 🔧 |
| [specifier-order](docs/rules/specifier-order.md) | Consistently order named import specifiers. | 🔧 |

<!-- end auto-generated rules list -->

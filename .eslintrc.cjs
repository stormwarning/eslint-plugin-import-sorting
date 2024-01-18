/** @type {import('eslint').Linter.Config} */
const config = {
	root: true,
	env: {
		es6: true,
		node: true,
	},
	parser: '@typescript-eslint/parser',
	parserOptions: {
		ecmaVersion: 2021,
	},
	settings: {
		'import/resolver': {
			node: {
				extensions: ['.js', '.jsx', '.ts', '.tsx'],
			},
		},
		'import/parsers': {
			[require.resolve('@typescript-eslint/parser')]: ['.ts', '.tsx'],
		},
	},
	extends: [
		'@zazen',
		'@zazen/eslint-config/node',
		'@zazen/eslint-config/typescript',
		'plugin:eslint-plugin/recommended',
		'prettier',
	],
	rules: {
		/** Disabling until I can get better type info. */
		'@typescript-eslint/no-unsafe-argument': 'warn',
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-return': 'warn',

		/** Disabled for now pending refactor. */
		'unicorn/no-array-reduce': 'off',

		'etc/no-assign-mutated-array': 'off',
		'etc/prefer-less-than': 'off',
	},
}

module.exports = config

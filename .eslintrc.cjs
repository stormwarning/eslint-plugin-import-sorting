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
	plugins: ['isort'],
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
		// '@zazen/eslint-config/typescript',
		'plugin:eslint-plugin/recommended',
		'prettier',
	],
	rules: {
		'import/extensions': [
			'error',
			'always',
			{
				pattern: {
					ts: 'never',
				},
			},
		],

		'import/order': 'off',

		'isort/sort-imports': 'error',
	},
	overrides: [
		{
			files: ['tests/**/*.{js,ts}'],
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
	],
}

module.exports = config
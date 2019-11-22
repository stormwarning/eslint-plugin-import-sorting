module.exports = {
    root: true,
    parser: '@typescript-eslint/parser',
    parserOptions: {
        // ecmaVersion: 2018,
        sourceType: 'module',
    },
    env: {
        node: true,
        es6: true,
    },
    plugins: [
        '@typescript-eslint',
        'eslint-plugin',
        'filenames',
        // 'import',
        'isort',
        // 'node',
    ],
    extends: [
        '@zazen/eslint-config',
        'plugin:@typescript-eslint/recommended',
        'plugin:eslint-comments/recommended',
        'plugin:eslint-plugin/all',
        // 'plugin:import/errors',
        // 'plugin:import/warnings',
        // 'plugin:node/recommended',
    ],
    rules: {
        'prefer-const': 'off',

        '@typescript-eslint/member-delimiter-style': [
            'error',
            { multiline: { delimiter: 'none' } },
        ],

        'isort/order': 'error',
    },
}

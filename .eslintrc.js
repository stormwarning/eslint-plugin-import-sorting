module.exports = {
    plugins: ['eslint-plugin', 'filenames', 'import', 'isort', 'node'],
    extends: [
        '@zazen/eslint-config',
        'plugin:eslint-comments/recommended',
        'plugin:eslint-plugin/all',
        'plugin:import/errors',
        'plugin:import/warnings',
        'plugin:node/recommended',
    ],
    rules: {
        'isort/order': 'error',
    },
}

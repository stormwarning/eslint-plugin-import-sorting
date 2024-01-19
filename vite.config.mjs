import { defineConfig } from 'vitest/config'

export default defineConfig({
	build: {
		lib: {
			entry: './src/index.ts',
			formats: ['cjs'],
			fileName: () => 'index.js',
		},
		minify: false,
		rollupOptions: {
			external: ['node:module', 'node:path'],
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: 'tests/**/*.ts',
	},
})

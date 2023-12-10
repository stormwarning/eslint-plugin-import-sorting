import { defineConfig } from 'vitest/config'

import ff from './src/index'

export default defineConfig({
	build: {
		lib: {
			entry: './src/index.ts',
			formats: ['cjs'],
			fileName: 'index',
		},
		rollupOptions: {
			// Make sure to externalize deps that shouldn't be bundled
			// into your library
			external: ['node:module', 'node:path'],
			// Output: {
			//   // Provide global variables to use in the UMD build
			//   // for externalized deps
			//   globals: {
			// 	vue: 'Vue',
			//   },
			// },
		},
	},
	test: {
		globals: true,
		environment: 'node',
		include: 'tests/lib/**/*.ts',
	},
})

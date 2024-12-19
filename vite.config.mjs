import fs from 'node:fs/promises'
import path from 'node:path'

import dts from 'vite-plugin-dts'
import { defineConfig } from 'vitest/config'

export default defineConfig({
	build: {
		lib: {
			entry: './src/index.ts',
			formats: ['cjs', 'es'],
			fileName: (format, name) => `${name}.${format === 'es' ? 'js' : 'cjs'}`,
		},
		minify: false,
		rollupOptions: {
			external: (id) => !id.startsWith('.') && !path.isAbsolute(id),
			output: {
				preserveModules: true,
				exports: 'auto',
			},
		},
	},

	plugins: [
		dts({
			async afterBuild() {
				await fs.writeFile(
					'dist/index.d.ts',
					(await fs.readFile('dist/index.d.ts'))
						// eslint-disable-next-line unicorn/no-await-expression-member
						.toString()
						.replace(/\nexport .+/, '') + 'export = _default',
				)
			},
			insertTypesEntry: true,
			strictOutput: true,
			rollupTypes: true,
		}),
	],

	test: {
		environment: 'node',
		include: ['tests/**/*.test.ts'],
	},
})

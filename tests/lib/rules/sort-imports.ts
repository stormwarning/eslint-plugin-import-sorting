import { RuleTester } from 'eslint'

import { sortImports as sortImportsRule } from '../../../src/lib/rules/sort-imports'

const ruleTester = new RuleTester({
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 6,
	},
})

ruleTester.run('sort-imports', sortImportsRule, {
	valid: [
		{
			filename: 'module.js',
			code: `
				import 'sideEffects.js'

				import fs from 'node:fs'

				import { x, y, z } from '@scope/package'
				import { a, b, c } from 'package'
				import Thing, { method } from 'package/path'

				import moduleB from '../../../module-b.js'
				import moduleD from '../../module-d.js'
				import moduleA from '../module-a.js'
				import moduleC from '../module-c.js'
				import Module from './index.js'

				import styles from './component.module.css'
			`,
		},
	],
	invalid: [
		// It sorts imports by module source.
		{
			filename: 'module.js',
			code: `
				import { a, b, c } from 'package/path'
				import { x, y, z } from 'package'
			`,
			output: `
				import { x, y, z } from 'package'
				import { a, b, c } from 'package/path'
			`,
			errors: [{ message: '`package` import should occur before import of `package/path`' }],
		},
		// It groups built-in modules separately.
		{
			filename: 'module.js',
			code: `
				import { x, y, z } from '@scope/package'
				import fs from 'node:fs'
				import { a, b, c } from 'package'
			`,
			output: `
				import fs from 'node:fs'
				import { x, y, z } from '@scope/package'
				import { a, b, c } from 'package'
			`,
			errors: [
				{ message: 'There should be at least one empty line between import groups' },
				{ message: '`node:fs` import should occur before import of `@scope/package`' },
			],
		},
		// It sorts local imports by number of dot segments.
		{
			filename: 'module.js',
			code: `
				import foo from './index.js'
				import moduleA from '../module-a.js'
				import moduleB from '../../../module-b.js'
				import moduleC from '../module-c.js'
				import moduleD from '../../module-d.js'
			`,
			output: `
				import moduleB from '../../../module-b.js'
				import moduleD from '../../module-d.js'
				import moduleA from '../module-a.js'
				import moduleC from '../module-c.js'
				import foo from './index.js'
			`,
			errors: [
				{
					message: '`./index.js` import should occur after import of `../../module-d.js`',
				},
				{
					message:
						'`../module-a.js` import should occur after import of `../../module-d.js`',
				},
				{
					message:
						'`../module-c.js` import should occur after import of `../../module-d.js`',
				},
			],
		},
		// This shouldn't pass
		{
			code: `
				import moduleA from '../module-a.js'
				import moduleB from '../../../module-b.js'
				import moduleC from '../module-c.js'
				import moduleD from '../../module-d.js'
				import foo from './index.js'
			`,
			output: `
				import moduleB from '../../../module-b.js'
				import moduleD from '../../module-d.js'
				import moduleA from '../module-a.js'
				import moduleC from '../module-c.js'
				import foo from './index.js'
			`,
			errors: [
				{
					message: '`./index.js` import should occur after import of `../../module-d.js`',
				},
			],
		},
		// It sorts specifiers alphabetically.
		// {
		// 	filename: 'module.js',
		// 	code: `
		// 		import { b, c, a } from 'package'
		// 	`,
		// 	output: `
		// 		import { a, b, c } from 'package'
		// 	`,
		// 	errors: [{ message: '`node:fs` import should occur before import of `react`' }],
		// },
	],
})

import { RuleTester } from '@typescript-eslint/rule-tester'
import dedent from 'dedent'

import orderRule from '../../src/rules/order.js'

const ruleTester = new RuleTester({
	parser: '@typescript-eslint/parser',
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 'latest',
	},
	settings: {
		'import-sorting/known-framework': [/^react(\/|-dom|-router|$)/.source, 'prop-types'],
		'import-sorting/internal-patterns': /^~/.source,
	},
})

ruleTester.run('order', orderRule, {
	valid: [
		{
			code: dedent`
				import 'sideEffects.js'

				import fs from 'node:fs'

				import { useState } from 'react'

				import { x, y, z } from '@scope/package'
				import { a, b, c } from 'package'
				import Thing, { method } from 'package/path'
				import flatten from 'react-keyed-flatten-children'

				import { Component } from '~/components'

				import moduleB from '../../../module-b.js'
				import moduleD from '../../module-d.js'
				import twoThings from '../get-things/get2Things.js'
				import tenThings from '../get-things/get10Things.js'
				import moduleA from '../HoverCard/module-c.js'
				import moduleC from '../Select/module-a.js'
				import Module from './index.js'

				import styles from './component.module.css'
			`,
		},
	],
	invalid: [
		// It sorts imports by module source.
		{
			code: `
				import { a, b, c } from 'package/path'
				import { x, y, z } from 'package'
			`,
			output: `
				import { x, y, z } from 'package'
				import { a, b, c } from 'package/path'
			`,
			errors: [{ messageId: 'out-of-order' }],
		},

		// It groups built-in modules separately.
		{
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
			errors: [{ messageId: 'needs-newline' }, { messageId: 'out-of-order' }],
		},

		// It groups framework modules separately.
		{
			code: `
				import { useState } from 'react'
				import flatten from 'react-keyed-flatten-children'
			`,
			output: `
				import { useState } from 'react'

				import flatten from 'react-keyed-flatten-children'
			`,
			errors: [{ messageId: 'needs-newline' }],
		},

		// It groups first-party modules separately.
		{
			code: `
				import A from 'package'
				import B from '~/components'
			`,
			output: `
				import A from 'package'

				import B from '~/components'
			`,
			errors: [{ messageId: 'needs-newline' }],
		},

		/**
		 * This test seems weirdly flaky; more than one line out of order in
		 * the input and the output result isn't fully re-ordered.  Works fine
		 * in 'live' testing though, and in the valid example above though...
		 */
		// It sorts local imports by number of dot segments.
		{
			code: `
				import moduleB from '../../module-b.js'
				import foo from './index.js'
				import moduleA from '../module-a.js'
			`,
			output: `
				import moduleB from '../../module-b.js'
				import moduleA from '../module-a.js'
				import foo from './index.js'
			`,
			errors: [
				{
					messageId: 'out-of-order',
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

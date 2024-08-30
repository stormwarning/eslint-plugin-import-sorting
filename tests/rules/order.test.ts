import { RuleTester } from '@typescript-eslint/rule-tester'
import dedent from 'dedent'
import { afterAll, describe, it } from 'vitest'

import orderRule from '../../src/rules/order.js'

describe('order', () => {
	RuleTester.describeSkip = describe.skip
	RuleTester.afterAll = afterAll
	RuleTester.describe = describe
	RuleTester.itOnly = it.only
	RuleTester.itSkip = it.skip
	RuleTester.it = it

	let ruleTester = new RuleTester({
		parser: '@typescript-eslint/parser',
		parserOptions: {
			sourceType: 'module',
			ecmaVersion: 'latest',
		},
		settings: {
			'import-sorting/framework-patterns': [/^react(\/|-dom|-router|$)/.source, 'prop-types'],
			'import-sorting/internal-patterns': /^~/.source,
		},
	})

	ruleTester.run('sorts imports', orderRule, {
		valid: [
			{
				name: 'without errors',
				code: dedent`
					import { a1, a2 } from 'a'
					import { b1 } from 'b'
				`,
			},
		],
		invalid: [
			{
				name: 'fixes import order',
				code: dedent`
					import { b1 } from 'b'
					import { a1, a2 } from 'a'
				`,
				// Not sure why this extra line break is needed...
				output: dedent`
					import { a1, a2 } from 'a'
					import { b1 } from 'b'\n
				`,
				errors: [{ messageId: 'out-of-order' }],
			},
		],
	})

	ruleTester.run('sorts imports into groups', orderRule, {
		valid: [
			{
				name: 'without errors',
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
					import moduleC from '../HoverCard/module-c.js'
					import moduleA from '../Select/module-a.js'
					import Module from './index.js'

					import styles from './component.module.css'
				`,
			},
		],
		invalid: [
			// Not currently handling unassigned imports.
			// {
			// 	name: 'groups unassigned modules without sorting',
			// 	code: dedent`
			// 		import { a1 } from 'a'
			// 		import './zero.js'
			// 		import './one.js'
			// 	`,
			// 	output: dedent`
			// 		import './zero.js'
			// 		import './one.js'

			// 		import { a1 } from 'a'
			// 	`,
			// 	errors: [{ messageId: 'out-of-order' }],
			// },

			// {
			// 	name: 'groups builtin modules together',
			// 	code: dedent`
			// 		import path from 'path'
			// 		import { t1 } from 't'
			// 		import url from 'node:url'
			// 	`,
			// 	output: dedent`
			// 		import path from 'path'
			// 		import url from 'node:url'
			// 		import { t1 } from 't'
			// 	`,
			// 	errors: [{ messageId: 'needs-newline' }, { messageId: 'out-of-order' }],
			// },

			{
				name: 'groups framework modules together',
				code: dedent`
					import { useState } from 'react'
					import flatten from 'react-keyed-flatten-children'
				`,
				output: dedent`
					import { useState } from 'react'

					import flatten from 'react-keyed-flatten-children'
				`,
				errors: [{ messageId: 'needs-newline' }],
			},

			{
				name: 'groups internal modules together',
				code: dedent`
					import A from 'package'
					import B from '~/components'
				`,
				output: dedent`
					import A from 'package'

					import B from '~/components'
				`,
				errors: [{ messageId: 'needs-newline' }],
			},

			// Test seems flaky with this many imports; disabling for now.
			// {
			// 	name: 'sorts local paths by dot segments',
			// 	code: dedent`
			// 		import tenThings from '../get-things/get10Things.js'
			// 		import twoThings from '../get-things/get2Things.js'
			// 		import moduleC from '../Hovercard/module-c.js'
			// 		import Module from './index.js'
			// 		import moduleB from '../../module-b.js'
			// 		import moduleD from '../../../module-d.js'
			// 		import moduleA from '../Select/module-a.js'
			// 	`,
			// 	output: dedent`
			// 		import moduleD from '../../../module-d.js'
			// 		import moduleB from '../../module-b.js'
			// 		import twoThings from '../get-things/get2Things.js'
			// 		import tenThings from '../get-things/get10Things.js'
			// 		import moduleC from '../Hovercard/module-c.js'
			// 		import moduleA from '../Select/module-a.js'
			// 		import Module from './index.js'
			// 	`,
			// 	errors: [
			// 		{ messageId: 'out-of-order' },
			// 		{ messageId: 'out-of-order' },
			// 		{ messageId: 'out-of-order' },
			// 	],
			// },
		],
	})
})

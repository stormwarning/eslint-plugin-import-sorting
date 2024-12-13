import { RuleTester } from '@typescript-eslint/rule-tester'
import dedent from 'dedent'
import { afterAll, describe, it } from 'vitest'

import rule from '../../src/rules/specifier-order.js'

describe('specifier-order', () => {
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
		// Use this after upgrade to eslint@9.
		// languageOptions: { ecmaVersion: 'latest', sourceType: 'module' },
		settings: {
			'import-sorting/framework-patterns': [/^react(\/|-dom|-router|$)/.source, 'prop-types'],
			'import-sorting/internal-patterns': /^~/.source,
		},
	})

	describe('sorting by natural order', () => {
		ruleTester.run('sorts specifiers', rule, {
			valid: [
				{
					name: 'without errors',
					code: dedent`
						import { a, bb, ccc } from 'package'
					`,
				},
			],
			invalid: [
				{
					name: 'fixes import order',
					code: dedent`
						import { bb, a, ccc } from 'package'
					`,
					output: dedent`
						import { a, bb, ccc } from 'package'
					`,
					errors: [
						{
							messageId: 'specifier-out-of-order',
							data: { left: 'bb', right: 'a' },
						},
					],
				},
			],
		})

		ruleTester.run('sorts specifiers on multiple lines', rule, {
			valid: [
				{
					name: 'without errors',
					code: dedent`
						import {
							a,
							bb,
							ccc,
							dddd,
						} from 'package'
					`,
				},
			],
			invalid: [
				{
					name: 'fixes member order',
					code: dedent`
						import {
							a,
							dddd,
							bb,
							ccc,
						} from 'package'
					`,
					output: dedent`
						import {
							a,
							bb,
							ccc,
							dddd,
						} from 'package'
					`,
					errors: [
						{
							messageId: 'specifier-out-of-order',
							data: { left: 'dddd', right: 'bb' },
						},
					],
				},
			],
		})

		ruleTester.run('sorts aliased specifiers', rule, {
			valid: [
				{
					name: 'without errors',
					code: dedent`
						import {
							a as z,
							bb as y,
							ccc,
						} from 'package'
					`,
				},
			],
			invalid: [
				{
					name: 'fixes member order',
					code: dedent`
						import {
							ccc,
							bb as y,
							a as z,
						} from 'package'
					`,
					output: dedent`
						import {
							a as z,
							bb as y,
							ccc,
						} from 'package'
					`,
					errors: [
						{
							messageId: 'specifier-out-of-order',
							data: { left: 'ccc', right: 'bb' },
						},
						{
							messageId: 'specifier-out-of-order',
							data: { left: 'bb', right: 'a' },
						},
					],
				},
			],
		})

		ruleTester.run('does not sort default specifiers', rule, {
			valid: [
				{
					name: 'without errors',
					code: dedent`
						import C, { b as A } from 'package'
					`,
				},
			],
			invalid: [],
		})

		ruleTester.run('groups specifiers by kind', rule, {
			valid: [
				{
					name: 'without errors',
					code: dedent`
						import {
							a,
							type bb,
							bb,
							type ccc,
						} from 'package'
					`,
				},
			],
			invalid: [
				{
					name: 'fixes member order',
					code: dedent`
						import {
							a,
							type bb,
							type ccc,
							bb,
						} from 'package'
					`,
					output: dedent`
						import {
							a,
							type bb,
							bb,
							type ccc,
						} from 'package'
					`,
					errors: [
						{
							messageId: 'specifier-out-of-order',
							data: { left: 'ccc', right: 'bb' },
						},
					],
				},
			],
		})
	})
})

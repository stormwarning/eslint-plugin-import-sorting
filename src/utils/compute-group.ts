import { builtinModules } from 'node:module'

import { AST_NODE_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils'

import { IMPORT_GROUPS } from '../rules/order.js'
import type { ImportDeclarationNode } from './types.js'
import { useGroups } from './use-groups.js'

export function computeGroup(
	node: ImportDeclarationNode,
	settings: TSESLint.SharedConfigurationSettings,
	sourceCode: TSESLint.SourceCode,
) {
	let { getGroup, defineGroup } = useGroups(IMPORT_GROUPS)

	if (
		node.type === AST_NODE_TYPES.ImportDeclaration ||
		node.type === AST_NODE_TYPES.VariableDeclaration
	) {
		let value: string
		let frameworkPatterns = validateSetting(settings, 'import-sorting/framework-patterns')
		let internalPatterns = validateSetting(settings, 'import-sorting/internal-patterns')

		if (node.type === AST_NODE_TYPES.ImportDeclaration) {
			value = node.source.value
		} else {
			let decl = node.declarations[0].init as TSESTree.CallExpression
			let declValue = (decl.arguments[0] as TSESTree.Literal).value
			value = declValue!.toString()
		}

		if (isSideEffectImport(node, sourceCode)) defineGroup('unassigned')
		if (isBuiltin(value)) defineGroup('builtin')
		if (isStyle(value)) defineGroup('style')
		if (frameworkPatterns && isFramework(value, frameworkPatterns)) defineGroup('framework')
		if (internalPatterns && isInternal(value, internalPatterns)) defineGroup('internal')
		if (isExternal(value)) defineGroup('external')
		if (isLocal(value)) defineGroup('local')
	}

	return getGroup()
}

export function isSideEffectImport(node: TSESTree.Node, sourceCode: TSESLint.SourceCode) {
	return (
		node.type === AST_NODE_TYPES.ImportDeclaration &&
		node.specifiers.length === 0 &&
		/* Avoid matching on named imports without specifiers. */
		!/}\s*from\s+/.test(sourceCode.getText(node))
	)
}

function isBuiltin(name: string) {
	let bunModules = [
		'bun',
		'bun:ffi',
		'bun:jsc',
		'bun:sqlite',
		'bun:test',
		'bun:wrap',
		'detect-libc',
		'undici',
		'ws',
	]
	let builtinPrefixOnlyModules = ['sea', 'sqlite', 'test']

	return (
		builtinModules.includes(name.startsWith('node:') ? name.split('node:')[1] : name) ||
		builtinPrefixOnlyModules.some((module) => `node:${module}` === name) ||
		bunModules.includes(name)
	)
}

const moduleRegExp = /^\w/
function isModule(name: string) {
	return moduleRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/
function isScoped(name: string) {
	return scopedRegExp.test(name)
}

function isFramework(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

function isExternal(name: string) {
	return isModule(name) || isScoped(name)
}

function isInternal(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

function isLocal(name: string) {
	return name.startsWith('.')
}

function isStyle(name: string) {
	return ['.less', '.scss', '.sass', '.styl', '.pcss', '.css', '.sss'].some((extension) =>
		name.endsWith(extension),
	)
}

function assertString(value: unknown, setting: string) {
	if (typeof value !== 'string')
		throw new Error(
			// eslint-disable-next-line @typescript-eslint/restrict-template-expressions
			`Invalid value for '${setting}': '${value}'.\nExpected 'string', got '${typeof value}' instead.`,
		)
}

function validateSetting(settings: TSESLint.SharedConfigurationSettings, setting: string) {
	let value = settings[setting] as string | string[]

	if (!value) return undefined
	if (Array.isArray(value)) {
		for (let item of value) {
			assertString(item, setting)
		}

		return value
	}

	assertString(value, setting)

	return value
}

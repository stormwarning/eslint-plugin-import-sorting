import { builtinModules } from 'node:module'

import { ESLintUtils, type TSESTree, type TSESLint, AST_NODE_TYPES } from '@typescript-eslint/utils'

import { compare } from '../utils/compare.js'
import { getCommentBefore } from '../utils/get-comment.js'
import { getGroupNumber } from '../utils/get-group-number.js'
import { getLinesBetween } from '../utils/get-lines-between.js'
import { getNodeRange } from '../utils/get-node-range.js'
import { pairwise } from '../utils/pairwise.js'
import { sortNodes } from '../utils/sort-nodes.js'
import type { Options, SortingNode } from '../utils/types'
import { useGroups } from '../utils/use-groups.js'

// eslint-disable-next-line new-cap
const createRule = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	name: 'order',
	meta: {
		type: 'suggestion',
		fixable: 'code',
		docs: {
			description: 'Enforce a convention in the order of `import` statements.',
		},
		messages: {
			'needs-newline':
				'There should be at least one empty line between {{left}} and {{right}}',
			'extra-newline': 'There should be no empty line between {{left}} and {{right}}',
			// 'extra-newline-in-group': 'There should be no empty line within import group',
			'out-of-order': '{{right}} should occur before {{left}}',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		let { settings, sourceCode } = context
		let options: Options = {
			groups: [
				'unassigned',
				'builtin',
				'framework',
				'external',
				'internal',
				'local',
				'style',
				'object',
				'unknown',
			],
			ignoreCase: true,
			newlinesBetween: 'always',
			order: 'asc',
			type: 'natural',
		}
		let nodes: SortingNode[] = []

		function registerNode(
			node:
				| TSESTree.TSImportEqualsDeclaration
				| TSESTree.VariableDeclaration
				| TSESTree.ImportDeclaration,
		) {
			let name: string

			if (node.type === AST_NODE_TYPES.ImportDeclaration) {
				name = node.source.value
			} else if (node.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
				name =
					node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
						? // @ts-expect-error -- `value` is not in the type definition.
						  `${node.moduleReference.expression.value}`
						: sourceCode.text.slice(...node.moduleReference.range)
			} else {
				let decl = node.declarations[0].init as TSESTree.CallExpression
				let declValue = (decl.arguments[0] as TSESTree.Literal).value
				name = declValue!.toString()
			}

			nodes.push({
				group: computeGroup(node, settings, sourceCode),
				node,
				name,
			})
		}

		return {
			TSImportEqualsDeclaration: registerNode,
			ImportDeclaration: registerNode,
			VariableDeclaration(node) {
				if (
					node.declarations[0].init &&
					node.declarations[0].init.type === AST_NODE_TYPES.CallExpression &&
					node.declarations[0].init.callee.type === AST_NODE_TYPES.Identifier &&
					node.declarations[0].init.callee.name === 'require' &&
					node.declarations[0].init.arguments[0]?.type === AST_NODE_TYPES.Literal
				) {
					registerNode(node)
				}
			},
			'Program:exit'() {
				let hasContentBetweenNodes = (left: SortingNode, right: SortingNode): boolean =>
					sourceCode.getTokensBetween(
						left.node,
						getCommentBefore(right.node, sourceCode) ?? right.node,
						{
							includeComments: true,
						},
					).length > 0

				let fix = (
					fixer: TSESLint.RuleFixer,
					nodesToFix: SortingNode[],
				): TSESLint.RuleFix[] => {
					let fixes: TSESLint.RuleFix[] = []

					let grouped: Record<string, SortingNode[]> = {}

					for (let node of nodesToFix) {
						let groupNumber = getGroupNumber(options.groups, node)

						grouped[groupNumber] =
							groupNumber in grouped
								? sortNodes([...grouped[groupNumber], node], options)
								: [node]
					}

					let formatted = Object.keys(grouped)
						.sort((a, b) => Number(a) - Number(b))
						.reduce(
							(accumulator: SortingNode[], group: string) => [
								...accumulator,
								...grouped[group],
							],
							[],
						)

					for (let max = formatted.length, index = 0; index < max; index++) {
						let node = formatted.at(index)!

						fixes.push(
							fixer.replaceTextRange(
								getNodeRange(nodesToFix.at(index)!.node, sourceCode),
								sourceCode.text.slice(...getNodeRange(node.node, sourceCode)),
							),
						)

						if (options.newlinesBetween !== 'ignore') {
							let nextNode = formatted.at(index + 1)

							if (nextNode) {
								let linesBetweenImports = getLinesBetween(
									sourceCode,
									nodesToFix.at(index)!,
									nodesToFix.at(index + 1)!,
								)

								if (
									(options.newlinesBetween === 'always' &&
										getGroupNumber(options.groups, node) ===
											getGroupNumber(options.groups, nextNode) &&
										linesBetweenImports !== 0) ||
									(options.newlinesBetween === 'never' && linesBetweenImports > 0)
								) {
									fixes.push(
										fixer.removeRange([
											getNodeRange(nodesToFix.at(index)!.node, sourceCode).at(
												1,
											)!,
											getNodeRange(
												nodesToFix.at(index + 1)!.node,
												sourceCode,
											).at(0)! - 1,
										]),
									)
								}

								if (
									options.newlinesBetween === 'always' &&
									getGroupNumber(options.groups, node) !==
										getGroupNumber(options.groups, nextNode) &&
									linesBetweenImports > 1
								) {
									fixes.push(
										fixer.replaceTextRange(
											[
												getNodeRange(
													nodesToFix.at(index)!.node,
													sourceCode,
												).at(1)!,
												getNodeRange(
													nodesToFix.at(index + 1)!.node,
													sourceCode,
												).at(0)! - 1,
											],
											'\n',
										),
									)
								}

								if (
									options.newlinesBetween === 'always' &&
									getGroupNumber(options.groups, node) !==
										getGroupNumber(options.groups, nextNode) &&
									linesBetweenImports === 0
								) {
									fixes.push(
										fixer.insertTextAfterRange(
											getNodeRange(nodesToFix.at(index)!.node, sourceCode),
											'\n',
										),
									)
								}
							}
						}
					}

					return fixes
				}

				let splittedNodes: SortingNode[][] = [[]]

				for (let node of nodes) {
					let lastNode = splittedNodes.at(-1)?.at(-1)

					if (lastNode && hasContentBetweenNodes(lastNode, node)) {
						splittedNodes.push([node])
					} else {
						splittedNodes.at(-1)!.push(node)
					}
				}

				for (let nodeList of splittedNodes) {
					pairwise(nodeList, (left, right) => {
						let leftNumber = getGroupNumber(options.groups, left)
						let rightNumber = getGroupNumber(options.groups, right)

						let numberOfEmptyLinesBetween = getLinesBetween(sourceCode, left, right)

						if (
							!(
								isSideEffectImport(left.node, sourceCode) &&
								isSideEffectImport(right.node, sourceCode)
							) &&
							!hasContentBetweenNodes(left, right) &&
							(leftNumber > rightNumber ||
								(leftNumber === rightNumber && compare(left, right, options) > 0))
						) {
							context.report({
								messageId: 'out-of-order',
								data: {
									left: left.name,
									right: right.name,
								},
								node: right.node,
								fix: (fixer) => fix(fixer, nodeList),
							})
						}

						if (options.newlinesBetween === 'never' && numberOfEmptyLinesBetween > 0) {
							context.report({
								messageId: 'extra-newline',
								data: {
									left: left.name,
									right: right.name,
								},
								node: right.node,
								fix: (fixer) => fix(fixer, nodeList),
							})
						}

						if (options.newlinesBetween === 'always') {
							if (leftNumber < rightNumber && numberOfEmptyLinesBetween === 0) {
								context.report({
									messageId: 'needs-newline',
									data: {
										left: left.name,
										right: right.name,
									},
									node: right.node,
									fix: (fixer) => fix(fixer, nodeList),
								})
							} else if (
								numberOfEmptyLinesBetween > 1 ||
								(leftNumber === rightNumber && numberOfEmptyLinesBetween > 0)
							) {
								context.report({
									messageId: 'extra-newline',
									data: {
										left: left.name,
										right: right.name,
									},
									node: right.node,
									fix: (fixer) => fix(fixer, nodeList),
								})
							}
						}
					})
				}
			},
		}
	},
})

function computeGroup(
	node:
		| TSESTree.TSImportEqualsDeclaration
		| TSESTree.VariableDeclaration
		| TSESTree.ImportDeclaration,
	settings: TSESLint.SharedConfigurationSettings,
	sourceCode: TSESLint.SourceCode,
) {
	let groups = [
		'unassigned',
		'builtin',
		'framework',
		'external',
		'internal',
		'local',
		'style',
		'object',
		'unknown',
	]
	let { getGroup, defineGroup } = useGroups(groups)

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
		if (isFramework(value, frameworkPatterns)) defineGroup('framework')
		if (isInternal(value, internalPatterns)) defineGroup('internal')
		if (isExternal(value)) defineGroup('external')
		if (isLocal(value)) defineGroup('local')
	}

	return getGroup()
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

function isSideEffectImport(node: TSESTree.Node, sourceCode: TSESLint.SourceCode) {
	return (
		node.type === AST_NODE_TYPES.ImportDeclaration &&
		node.specifiers.length === 0 &&
		/* Avoid matching on named imports without specifiers. */
		!/}\s*from\s+/.test(sourceCode.getText(node))
	)
}

function isStyle(name: string) {
	return ['.less', '.scss', '.sass', '.styl', '.pcss', '.css', '.sss'].some((extension) =>
		name.endsWith(extension),
	)
}

function isFramework(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

function isInternal(name: string, pattern: string | string[]) {
	if (Array.isArray(pattern)) {
		return pattern.some((item) => new RegExp(item).test(name))
	}

	return new RegExp(pattern).test(name)
}

const moduleRegExp = /^\w/
function isModule(name: string) {
	return moduleRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/
function isScoped(name: string) {
	return scopedRegExp.test(name)
}

function isExternal(name: string) {
	return isModule(name) || isScoped(name)
}

function isLocal(name: string) {
	return name.startsWith('.')
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

	if (!value) return ''
	if (Array.isArray(value)) {
		for (let item of value) {
			assertString(item, setting)
		}

		return value
	}

	assertString(value, setting)

	return value
}

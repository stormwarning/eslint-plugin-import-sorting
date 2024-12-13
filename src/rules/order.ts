import { AST_NODE_TYPES, ESLintUtils, type TSESTree, type TSESLint } from '@typescript-eslint/utils'

import { compare } from '../utils/compare.js'
import { computeGroup, isSideEffectImport } from '../utils/compute-group.js'
import { getCommentsBefore } from '../utils/get-comment.js'
import { getEslintDisabledLines } from '../utils/get-eslint-disabled-lines.js'
import { getGroupNumber } from '../utils/get-group-number.js'
import { getLinesBetween } from '../utils/get-lines-between.js'
import { getNewlineErrors } from '../utils/get-newline-errors.js'
import { getNodeRange } from '../utils/get-node-range.js'
import { isNodeEslintDisabled } from '../utils/is-node-eslint-disabled.js'
import { makeFixes } from '../utils/make-fixes.js'
import { makeNewlineFixes } from '../utils/make-newline-fixes.js'
import { pairwise } from '../utils/pairwise.js'
import { rangeToDiff } from '../utils/range-to-diff.js'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.js'
import { sortNodes } from '../utils/sort-nodes.js'
import type { ImportDeclarationNode, Options, SortingNode } from '../utils/types.js'

export const IMPORT_GROUPS = [
	'unassigned',
	'builtin',
	'framework',
	'external',
	'internal',
	'local',
	'style',
	'object',
	'unknown',
] as const

type MessageId = 'out-of-order' | 'needs-newline' | 'extra-newline'

// eslint-disable-next-line new-cap
const createRule = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/${name}.md`,
)

export default createRule<unknown[], MessageId>({
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
			'out-of-order': '{{right}} should occur before {{left}}',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		let { settings, sourceCode } = context
		let options: Options = {
			ignoreCase: true,
			newlinesBetween: 'always',
			order: 'asc',
			type: 'natural',
		}
		let eslintDisabledLines = getEslintDisabledLines({
			ruleName: context.id,
			sourceCode,
		})
		let nodes: SortingNode[] = []

		function registerNode(node: ImportDeclarationNode) {
			let name: string

			if (node.type === AST_NODE_TYPES.ImportDeclaration) {
				name = node.source.value
			} else if (node.type === AST_NODE_TYPES.TSImportEqualsDeclaration) {
				name =
					node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference
						? node.moduleReference.expression.value
						: sourceCode.getText(node.moduleReference)
			} else {
				let decl = node.declarations[0].init as TSESTree.CallExpression
				let { value } = decl.arguments[0] as TSESTree.Literal
				name = value!.toString()
			}

			nodes.push({
				group: computeGroup(node, settings, sourceCode),
				isEslintDisabled: isNodeEslintDisabled(node, eslintDisabledLines),
				name,
				node,
				size: rangeToDiff(node, sourceCode),
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
			// eslint-disable-next-line @typescript-eslint/naming-convention
			'Program:exit'() {
				function hasContentBetweenNodes(left: SortingNode, right: SortingNode): boolean {
					return (
						sourceCode.getTokensBetween(left.node, right.node, {
							includeComments: false,
						}).length > 0
					)
				}
				//
				// let hasContentBetweenNodes = (left: SortingNode, right: SortingNode): boolean =>
				// 	sourceCode.getTokensBetween(
				// 		left.node,
				// 		getCommentBefore(right.node, sourceCode) ?? right.node,
				// 		{
				// 			includeComments: true,
				// 		},
				// 	).length > 0

				let formattedNodes: SortingNode[][] = [[]]

				for (let node of nodes) {
					let lastNode = formattedNodes.at(-1)?.at(-1)

					if (lastNode && hasContentBetweenNodes(lastNode, node)) {
						/**
						 * Including `node` in this empty array allows groups
						 * of imports separated by other statements to be
						 * sorted, but may break other aspects.
						 */
						formattedNodes.push([node])
					} else {
						formattedNodes.at(-1)!.push(node)
					}
				}

				for (let nodeList of formattedNodes) {
					let sortedNodes = sortNodesByGroups(nodeList, options, {})
					pairwise(nodeList, (left, right) => {
						let leftNumber = getGroupNumber(IMPORT_GROUPS, left)
						let rightNumber = getGroupNumber(IMPORT_GROUPS, right)
						let indexOfLeft = sortedNodes.indexOf(left)
						let indexOfRight = sortedNodes.indexOf(right)

						let messages: MessageId[] = []

						if (indexOfLeft > indexOfRight) {
							messages.push(
								leftNumber === rightNumber ? 'out-of-order' : 'out-of-order',
							)
						}

						messages = [
							...messages,
							...getNewlineErrors({
								missingLineError: 'needs-newline',
								extraLineError: 'extra-newline',
								left,
								leftNumber,
								right,
								rightNumber,
								sourceCode,
								options,
							}),
						]

						for (let message of messages) {
							context.report({
								fix: (fixer) => [
									...makeFixes({
										fixer,
										nodes: nodeList,
										sortedNodes,
										sourceCode,
										//
										// options,
									}),
									...makeNewlineFixes({
										fixer,
										nodes: nodeList,
										sortedNodes,
										sourceCode,
										options,
									}),
								],
								data: {
									rightGroup: right.group,
									leftGroup: left.group,
									right: right.name,
									left: left.name,
								},
								node: right.node,
								messageId: message,
							})
						}

						//
						// let numberOfEmptyLinesBetween = getLinesBetween(sourceCode, left, right)
						//
						// if (
						// 	!(
						// 		isSideEffectImport(left.node, sourceCode) &&
						// 		isSideEffectImport(right.node, sourceCode)
						// 	) &&
						// 	!hasContentBetweenNodes(left, right) &&
						// 	(leftNumber > rightNumber ||
						// 		(leftNumber === rightNumber && compare(left, right, options) > 0))
						// ) {
						// 	context.report({
						// 		messageId: 'out-of-order',
						// 		data: {
						// 			left: left.name,
						// 			right: right.name,
						// 		},
						// 		node: right.node,
						// 		fix: (fixer) => fix(fixer, nodeList, sourceCode, options),
						// 	})
						// }
						//
						// if (options.newlinesBetween === 'never' && numberOfEmptyLinesBetween > 0) {
						// 	context.report({
						// 		messageId: 'extra-newline',
						// 		data: {
						// 			left: left.name,
						// 			right: right.name,
						// 		},
						// 		node: right.node,
						// 		fix: (fixer) => fix(fixer, nodeList, sourceCode, options),
						// 	})
						// }
						//
						// if (options.newlinesBetween === 'always') {
						// 	if (leftNumber < rightNumber && numberOfEmptyLinesBetween === 0) {
						// 		context.report({
						// 			messageId: 'needs-newline',
						// 			data: {
						// 				left: left.name,
						// 				right: right.name,
						// 			},
						// 			node: right.node,
						// 			fix: (fixer) => fix(fixer, nodeList, sourceCode, options),
						// 		})
						// 	} else if (
						// 		numberOfEmptyLinesBetween > 1 ||
						// 		(leftNumber === rightNumber && numberOfEmptyLinesBetween > 0)
						// 	) {
						// 		context.report({
						// 			messageId: 'extra-newline',
						// 			data: {
						// 				left: left.name,
						// 				right: right.name,
						// 			},
						// 			node: right.node,
						// 			fix: (fixer) => fix(fixer, nodeList, sourceCode, options),
						// 		})
						// 	}
						// }
					})
				}
			},
		}
	},
})

function fix(
	fixer: TSESLint.RuleFixer,
	nodesToFix: SortingNode[],
	sourceCode: TSESLint.SourceCode,
	options: Options,
): TSESLint.RuleFix[] {
	let fixes: TSESLint.RuleFix[] = []
	let grouped: Record<string, SortingNode[]> = {}

	for (let node of nodesToFix) {
		let groupNumber = getGroupNumber(IMPORT_GROUPS, node)

		grouped[groupNumber] =
			groupNumber in grouped ? sortNodes([...grouped[groupNumber], node], options) : [node]
	}

	let formatted = Object.keys(grouped)
		.sort((a, b) => Number(a) - Number(b))
		.reduce(
			(accumulator: SortingNode[], group: string) => [...accumulator, ...grouped[group]],
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
						getGroupNumber(IMPORT_GROUPS, node) ===
							getGroupNumber(IMPORT_GROUPS, nextNode) &&
						linesBetweenImports !== 0) ||
					(options.newlinesBetween === 'never' && linesBetweenImports > 0)
				) {
					fixes.push(
						fixer.removeRange([
							getNodeRange(nodesToFix.at(index)!.node, sourceCode).at(1)!,
							getNodeRange(nodesToFix.at(index + 1)!.node, sourceCode).at(0)! - 1,
						]),
					)
				}

				if (
					options.newlinesBetween === 'always' &&
					getGroupNumber(IMPORT_GROUPS, node) !==
						getGroupNumber(IMPORT_GROUPS, nextNode) &&
					linesBetweenImports > 1
				) {
					fixes.push(
						fixer.replaceTextRange(
							[
								getNodeRange(nodesToFix.at(index)!.node, sourceCode).at(1)!,
								getNodeRange(nodesToFix.at(index + 1)!.node, sourceCode).at(0)! - 1,
							],
							'\n',
						),
					)
				}

				if (
					options.newlinesBetween === 'always' &&
					getGroupNumber(IMPORT_GROUPS, node) !==
						getGroupNumber(IMPORT_GROUPS, nextNode) &&
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

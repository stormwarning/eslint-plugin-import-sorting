import { AST_NODE_TYPES, ESLintUtils, type TSESTree } from '@typescript-eslint/utils'

import { computeGroup } from '../utils/compute-group.js'
import { getEslintDisabledLines } from '../utils/get-eslint-disabled-lines.js'
import { getGroupNumber } from '../utils/get-group-number.js'
import { getNewlineErrors } from '../utils/get-newline-errors.js'
import { isNodeEslintDisabled } from '../utils/is-node-eslint-disabled.js'
import { makeFixes } from '../utils/make-fixes.js'
import { makeNewlineFixes } from '../utils/make-newline-fixes.js'
import { pairwise } from '../utils/pairwise.js'
import { rangeToDiff } from '../utils/range-to-diff.js'
import { sortNodesByGroups } from '../utils/sort-nodes-by-groups.js'
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
					})
				}
			},
		}
	},
})

import { AST_NODE_TYPES, ESLintUtils } from '@typescript-eslint/utils'

import { getEslintDisabledLines } from '../utils/get-eslint-disabled-lines.js'
import { isNodeEslintDisabled } from '../utils/is-node-eslint-disabled.js'
import { isSortable } from '../utils/is-sortable.js'
import { makeFixes } from '../utils/make-fixes.js'
import { pairwise } from '../utils/pairwise.js'
import { rangeToDiff } from '../utils/range-to-diff.js'
import { sortNodes } from '../utils/sort-nodes.js'
import type { MemberSortingNode } from '../utils/types.js'

type ValuesFirstOrder = ['value', 'type']
type TypesFirstOrder = ['type', 'value']
type MixedOrder = ['any']

interface Options {
	ignoreAlias?: boolean
	ignoreCase?: boolean
	groupKind?: 'values-first' | 'types-first' | 'mixed'
	order: 'asc' | 'desc'
	type: 'natural'
}

type MessageId = 'specifier-out-of-order'

// eslint-disable-next-line new-cap
const createRule = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/${name}.md`,
)

export default createRule<unknown[], MessageId>({
	name: 'specifier-order',
	meta: {
		type: 'suggestion',
		fixable: 'code',
		docs: {
			description: 'Consistently order named import specifiers.',
		},
		messages: {
			'specifier-out-of-order': '{{right}} should occur before {{left}}',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		let { sourceCode } = context
		let options: Options = {
			ignoreAlias: true,
			ignoreCase: true,
			groupKind: 'mixed',
			order: 'asc',
			type: 'natural',
		}

		return {
			ImportDeclaration(node) {
				let specifiers = node.specifiers.filter(
					({ type }) => type === AST_NODE_TYPES.ImportSpecifier,
				)
				if (!isSortable(specifiers)) return

				let eslintDisabledLines = getEslintDisabledLines({
					ruleName: context.id,
					sourceCode,
				})

				let formattedMembers: MemberSortingNode[][] = [[]]
				for (let specifier of specifiers) {
					let { name } = specifier.local

					if (specifier.type === AST_NODE_TYPES.ImportSpecifier && options.ignoreAlias) {
						name =
							specifier.imported.type === AST_NODE_TYPES.Identifier
								? specifier.imported.name
								: // @ts-expect-error -- `value` possibly missing from type declarations.
								  (specifier.imported.value as string)
					}

					let sortingNode: MemberSortingNode = {
						groupKind:
							specifier.type === AST_NODE_TYPES.ImportSpecifier &&
							specifier.importKind === 'type'
								? 'type'
								: 'value',
						isEslintDisabled: isNodeEslintDisabled(specifier, eslintDisabledLines),
						size: rangeToDiff(specifier, sourceCode),
						node: specifier,
						name,
					}

					formattedMembers.at(-1)!.push(sortingNode)
				}

				let groupKindOrder: ValuesFirstOrder | TypesFirstOrder | MixedOrder
				if (options.groupKind === 'values-first') {
					groupKindOrder = ['value', 'type']
				} else if (options.groupKind === 'types-first') {
					groupKindOrder = ['type', 'value']
				} else {
					groupKindOrder = ['any']
				}

				for (let nodes of formattedMembers) {
					let filteredGroupKindNodes = groupKindOrder.map(
						(groupKind: 'value' | 'type' | 'any') =>
							nodes.filter(
								(currentNode) =>
									groupKind === 'any' || currentNode.groupKind === groupKind,
							),
					)
					let sortNodesExcludingEslintDisabled = (
						ignoreEslintDisabledNodes: boolean,
					): MemberSortingNode[] =>
						filteredGroupKindNodes.flatMap((groupedNodes) =>
							sortNodes(groupedNodes, options, {
								ignoreEslintDisabledNodes,
							}),
						)
					let sortedNodes = sortNodesExcludingEslintDisabled(false)
					let sortedNodesExcludingEslintDisabled = sortNodesExcludingEslintDisabled(true)

					pairwise(nodes, (left, right) => {
						let indexOfLeft = sortedNodes.indexOf(left)
						let indexOfRight = sortedNodes.indexOf(right)
						let indexOfRightExcludingEslintDisabled =
							sortedNodesExcludingEslintDisabled.indexOf(right)
						if (
							indexOfLeft < indexOfRight &&
							indexOfLeft < indexOfRightExcludingEslintDisabled
						) {
							return
						}

						context.report({
							fix: (fixer) =>
								makeFixes({
									fixer,
									nodes,
									sortedNodes: sortedNodesExcludingEslintDisabled,
									sourceCode,
								}),
							data: {
								right: right.name,
								left: left.name,
							},
							messageId: 'specifier-out-of-order',
							node: right.node,
						})
					})
				}
			},
		}
	},
})

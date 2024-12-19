import type { TSESLint } from '@typescript-eslint/utils'

import { getNodeRange } from './get-node-range.js'
import { makeCommentAfterFixes } from './make-comment-after-fixes.js'
import type { SortingNode } from './types.js'

interface MakeFixesParameters {
	fixer: TSESLint.RuleFixer
	nodes: SortingNode[]
	sortedNodes: SortingNode[]
	sourceCode: TSESLint.SourceCode
	ignoreFirstNodeHighestBlockComment?: boolean
}

export function makeFixes({
	fixer,
	nodes,
	sortedNodes,
	sourceCode,
	ignoreFirstNodeHighestBlockComment,
}: MakeFixesParameters): TSESLint.RuleFix[] {
	let fixes: TSESLint.RuleFix[] = []

	for (let max = nodes.length, index = 0; index < max; index++) {
		let sortingNode = nodes.at(index)!
		let sortedSortingNode = sortedNodes.at(index)!
		let { node } = sortingNode
		let { node: sortedNode } = sortedSortingNode
		let isNodeFirstNode = node === nodes.at(0)!.node
		let isSortedNodeFirstNode = sortedNode === nodes.at(0)!.node

		if (node === sortedNode) {
			continue
		}

		let sortedNodeCode = sourceCode.text.slice(
			...getNodeRange(sortedNode, sourceCode, {
				ignoreHighestBlockComment: ignoreFirstNodeHighestBlockComment && isSortedNodeFirstNode,
			}),
		)
		let sortedNodeText = sourceCode.getText(sortedNode)
		let tokensAfter = sourceCode.getTokensAfter(node, {
			includeComments: false,
			count: 1,
		})
		let nextToken = tokensAfter.at(0)

		let willSortedNextNodeEndWithSafeCharacter =
			sortedNodeText.endsWith(';') || sortedNodeText.endsWith(',')
		let isNextTokenOnSameLineAsNode = nextToken?.loc.start.line === node.loc.end.line
		let isNextTokenSafeCharacter = nextToken?.value === ';' || nextToken?.value === ','
		if (
			isNextTokenOnSameLineAsNode &&
			!willSortedNextNodeEndWithSafeCharacter &&
			!isNextTokenSafeCharacter
		) {
			sortedNodeCode += ';'
		}

		fixes.push(
			fixer.replaceTextRange(
				getNodeRange(node, sourceCode, {
					ignoreHighestBlockComment: ignoreFirstNodeHighestBlockComment && isNodeFirstNode,
				}),
				sortedNodeCode,
			),
		)
		fixes = [
			...fixes,
			...makeCommentAfterFixes({
				fixer,
				node,
				sortedNode,
				sourceCode,
			}),
		]
	}

	return fixes
}

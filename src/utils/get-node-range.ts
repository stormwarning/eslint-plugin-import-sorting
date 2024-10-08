import { ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils'

import { getCommentBefore } from './get-comment.js'

export function getNodeRange(
	node: TSESTree.Node,
	sourceCode: TSESLint.SourceCode,
	additionalOptions?: {
		partitionComment?: string[] | boolean | string
	},
): TSESTree.Range {
	let start = node.range.at(0)!
	let end = node.range.at(1)!

	let raw = sourceCode.text.slice(start, end)

	if (ASTUtils.isParenthesized(node, sourceCode)) {
		let bodyOpeningParen = sourceCode.getTokenBefore(node, ASTUtils.isOpeningParenToken)!

		let bodyClosingParen = sourceCode.getTokenAfter(node, ASTUtils.isClosingParenToken)!

		start = bodyOpeningParen.range.at(0)!
		end = bodyClosingParen.range.at(1)!
	}

	let comment = getCommentBefore(node, sourceCode)

	if (raw.endsWith(';') || raw.endsWith(',')) {
		let tokensAfter = sourceCode.getTokensAfter(node, {
			includeComments: true,
			count: 2,
		})

		if (node.loc.start.line === tokensAfter.at(1)?.loc.start.line) {
			end -= 1
		}
	}

	if (comment) {
		start = comment.range.at(0)!
	}

	return [start, end]
}

import { AST_TOKEN_TYPES, ASTUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils'

import { getCommentsBefore } from './get-comment.js'
import { getEslintDisabledRules } from './get-eslint-disabled-rules.js'

export function getNodeRange(
	node: TSESTree.Node,
	sourceCode: TSESLint.SourceCode,
	additionalOptions?: {
		ignoreHighestBlockComment?: boolean
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

	let comments = getCommentsBefore(node, sourceCode)
	let highestBlockComment = comments.find((comment) => comment.type === AST_TOKEN_TYPES.Block)
	let relevantTopComment: TSESTree.Comment | undefined

	/**
	 * Iterate on all comments starting from the bottom until we reach the last
	 * of the comments, a newline between comments, a partition comment,
	 * or an eslint-disable comment.
	 */
	for (let index = comments.length - 1; index >= 0; index--) {
		let comment = comments[index]

		let eslintDisabledRules = getEslintDisabledRules(comment.value)
		if (
			eslintDisabledRules?.eslintDisableDirective === 'eslint-disable' ||
			eslintDisabledRules?.eslintDisableDirective === 'eslint-enable'
		) {
			break
		}

		// Check for newlines between comments or between the first comment and
		// the node.
		let previousCommentOrNodeStartLine =
			index === comments.length - 1 ? node.loc.start.line : comments[index + 1].loc.start.line
		if (comment.loc.end.line !== previousCommentOrNodeStartLine - 1) {
			break
		}

		if (additionalOptions?.ignoreHighestBlockComment && comment === highestBlockComment) {
			break
		}

		relevantTopComment = comment
	}

	if (relevantTopComment) {
		start = relevantTopComment.range.at(0)!
	}

	return [start, end]
}

import type { TSESLint } from '@typescript-eslint/utils'

import type { ImportNode } from '../../rules/order.js'
import { takeTokensAfterWhile, takeTokensBeforeWhile } from './take-tokens.js'

export function findStartOfLineWithComments(sourceCode: TSESLint.SourceCode, node: ImportNode) {
	let tokensToEndOfLine = takeTokensBeforeWhile(sourceCode, node, commentOnSameLineAs(node))
	let startOfTokens =
		tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range?.[0] : node.range?.[0]
	let result = startOfTokens

	for (let index = startOfTokens - 1; index > 0; index--) {
		if (sourceCode.text[index] !== ' ' && sourceCode.text[index] !== '\t') {
			break
		}

		result = index
	}

	return result
}

export function findEndOfLineWithComments(sourceCode: TSESLint.SourceCode, node: ImportNode) {
	let tokensToEndOfLine = takeTokensAfterWhile(sourceCode, node, commentOnSameLineAs(node))
	let endOfTokens = (
		tokensToEndOfLine.length > 0 ? tokensToEndOfLine.at(-1)?.range?.[1] : node.range?.[1]
	)!
	let result = endOfTokens

	for (let index = endOfTokens; index < sourceCode.text.length; index++) {
		if (sourceCode.text[index] === '\n') {
			result = index + 1
			break
		}

		if (
			sourceCode.text[index] !== ' ' &&
			sourceCode.text[index] !== '\t' &&
			sourceCode.text[index] !== '\r'
		) {
			break
		}

		result = index + 1
	}

	return result
}

/** @todo rename to has-comment-on-same-line */
export function commentOnSameLineAs(node: ImportNode) {
	return (token: any) =>
		(token.type === 'Block' || token.type === 'Line') &&
		token.loc.start.line === token.loc.end.line &&
		token.loc.end.line === node.loc.end.line
}

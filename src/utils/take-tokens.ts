import type { TSESLint } from '@typescript-eslint/utils'
import type { AST } from 'eslint'

import type { ImportNode } from '../rules/order.js'

function getTokensOrCommentsBefore(sourceCode: TSESLint.SourceCode, node: ImportNode, count = 100) {
	let currentNodeOrToken = node
	let result: Array<ImportNode | AST.Token> = []

	for (let index = 0; index < count; index++) {
		// @ts-expect-error -- Not sure where this method comes from.
		currentNodeOrToken = sourceCode.getTokenOrCommentBefore(currentNodeOrToken)
		// eslint-disable-next-line no-eq-null, eqeqeq
		if (currentNodeOrToken == null) {
			break
		}

		result.push(currentNodeOrToken)
	}

	return result.reverse()
}

export function takeTokensBeforeWhile(
	sourceCode: TSESLint.SourceCode,
	node: ImportNode,
	condition: (_token: ImportNode | AST.Token) => boolean,
) {
	let tokens = getTokensOrCommentsBefore(sourceCode, node, 100)
	let result: Array<ImportNode | AST.Token> = []

	for (let index = tokens.length - 1; index >= 0; index--) {
		if (condition(tokens[index])) {
			result.push(tokens[index])
		} else {
			break
		}
	}

	return result.reverse()
}

function getTokensOrCommentsAfter(
	sourceCode: TSESLint.SourceCode,
	node: ImportNode,
	count: number,
) {
	let currentNodeOrToken = node
	let result: Array<ImportNode | AST.Token> = []

	for (let index = 0; index < count; index++) {
		// @ts-expect-error -- Not sure where this method comes from.
		currentNodeOrToken = sourceCode.getTokenOrCommentAfter(currentNodeOrToken)
		// eslint-disable-next-line no-eq-null, eqeqeq
		if (currentNodeOrToken == null) {
			break
		}

		result.push(currentNodeOrToken)
	}

	return result
}

export function takeTokensAfterWhile(
	sourceCode: TSESLint.SourceCode,
	node: ImportNode,
	condition: (_token: ImportNode | AST.Token) => boolean,
) {
	let tokens = getTokensOrCommentsAfter(sourceCode, node, 100)
	let result: Array<ImportNode | AST.Token> = []

	for (let token of tokens) {
		if (condition(token)) {
			result.push(token)
		} else {
			break
		}
	}

	return result
}

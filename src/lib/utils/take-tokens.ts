import type { SourceCode, AST, Rule } from 'eslint'
import * as ESTree from 'estree'

function getTokensOrCommentsBefore(sourceCode: SourceCode, node: Rule.Node, count = 100) {
	let currentNodeOrToken = node
	let result: Array<ESTree.Node | AST.Token> = []

	for (let index = 0; index < count; index++) {
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
	sourceCode: SourceCode,
	node: Rule.Node,
	condition: (_token: ESTree.Node | AST.Token) => boolean,
) {
	let tokens = getTokensOrCommentsBefore(sourceCode, node, 100)
	let result: Array<ESTree.Node | AST.Token> = []

	for (let index = tokens.length - 1; index >= 0; index--) {
		if (condition(tokens[index])) {
			result.push(tokens[index])
		} else {
			break
		}
	}

	return result.reverse()
}

function getTokensOrCommentsAfter(sourceCode: SourceCode, node: Rule.Node, count: number) {
	let currentNodeOrToken = node
	let result: Array<ESTree.Node | AST.Token> = []

	for (let index = 0; index < count; index++) {
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
	sourceCode: SourceCode,
	node: Rule.Node,
	condition: (_token: ESTree.Node | AST.Token) => boolean,
) {
	let tokens = getTokensOrCommentsAfter(sourceCode, node, 100)
	let result: Array<ESTree.Node | AST.Token> = []

	for (let token of tokens) {
		if (condition(token)) {
			result.push(token)
		} else {
			break
		}
	}

	return result
}

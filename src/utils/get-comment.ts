import { AST_TOKEN_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils'

export function getCommentBefore(
	node: TSESTree.Node,
	source: TSESLint.SourceCode,
): TSESTree.Comment | undefined {
	let [tokenBefore, tokenOrCommentBefore] = source.getTokensBefore(node, {
		filter: ({ value, type }) =>
			!(type === AST_TOKEN_TYPES.Punctuator && [',', ';'].includes(value)),
		includeComments: true,
		count: 2,
	}) as Array<TSESTree.Token | undefined>

	if (
		(tokenOrCommentBefore?.type === AST_TOKEN_TYPES.Block ||
			tokenOrCommentBefore?.type === AST_TOKEN_TYPES.Line) &&
		node.loc.start.line - tokenOrCommentBefore.loc.end.line <= 1 &&
		tokenBefore?.loc.end.line !== tokenOrCommentBefore.loc.start.line
	) {
		return tokenOrCommentBefore
	}

	return undefined
}

export function getCommentAfter(
	node: TSESTree.Node,
	source: TSESLint.SourceCode,
): TSESTree.Comment | undefined {
	let token = source.getTokenAfter(node, {
		filter: ({ value, type }) =>
			!(type === AST_TOKEN_TYPES.Punctuator && [',', ';'].includes(value)),
		includeComments: true,
	})

	if (
		(token?.type === AST_TOKEN_TYPES.Block || token?.type === AST_TOKEN_TYPES.Line) &&
		node.loc.end.line === token.loc.end.line
	) {
		return token
	}

	return undefined
}

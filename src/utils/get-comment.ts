import { AST_TOKEN_TYPES, type TSESLint, type TSESTree } from '@typescript-eslint/utils'

/**
 * Returns a list of comments before a given node, excluding ones that are
 * right after code.  Includes comment blocks.
 */
export function getCommentsBefore(
	node: TSESTree.Node,
	source: TSESLint.SourceCode,
	tokenValueToIgnoreBefore?: string,
): TSESTree.Comment[] {
	let commentsBefore = getCommentsBeforeNodeOrToken(node, source)
	let tokenBeforeNode = source.getTokenBefore(node)

	if (
		commentsBefore.length > 0 ||
		!tokenValueToIgnoreBefore ||
		tokenBeforeNode?.value !== tokenValueToIgnoreBefore
	) {
		return commentsBefore
	}

	return getCommentsBeforeNodeOrToken(tokenBeforeNode, source)
}

function getCommentsBeforeNodeOrToken(
	node: TSESTree.Node | TSESTree.Token,
	source: TSESLint.SourceCode,
): TSESTree.Comment[] {
	/**
	 * `getCommentsBefore` also returns comments that are right after code,
	 * filter those out.
	 */
	return source.getCommentsBefore(node).filter((comment) => {
		let tokenBeforeComment = source.getTokenBefore(comment)
		return tokenBeforeComment?.loc.end.line !== comment.loc.end.line
	})
}

export function getCommentAfter(
	node: TSESTree.Node | TSESTree.Token,
	source: TSESLint.SourceCode,
): TSESTree.Comment | undefined {
	let token = source.getTokenAfter(node, {
		filter: ({ value, type }) =>
			!(type === AST_TOKEN_TYPES.Punctuator && [',', ';', ':'].includes(value)),
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

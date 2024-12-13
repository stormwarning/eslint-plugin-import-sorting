import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

import { getCommentAfter } from './get-comment.js'

interface CommentAfterFixesParameters {
	fixer: TSESLint.RuleFixer
	node: TSESTree.Token | TSESTree.Node
	sortedNode: TSESTree.Token | TSESTree.Node
	sourceCode: TSESLint.SourceCode
}

export function makeCommentAfterFixes({
	fixer,
	node,
	sortedNode,
	sourceCode,
}: CommentAfterFixesParameters): TSESLint.RuleFix[] {
	let commentAfter = getCommentAfter(sortedNode, sourceCode)
	let isNodesOnSameLine = node.loc.start.line === sortedNode.loc.end.line

	if (!commentAfter || isNodesOnSameLine) return []

	let fixes: TSESLint.RuleFix[] = []
	let tokenBefore = sourceCode.getTokenBefore(commentAfter)

	let range: TSESTree.Range = [tokenBefore!.range.at(1)!, commentAfter.range.at(1)!]

	fixes.push(fixer.replaceTextRange(range, ''))

	let tokenAfterNode = sourceCode.getTokenAfter(node)

	fixes.push(
		fixer.insertTextAfter(
			tokenAfterNode?.loc.end.line === node.loc.end.line ? tokenAfterNode : node,
			sourceCode.text.slice(...range),
		),
	)

	return fixes
}

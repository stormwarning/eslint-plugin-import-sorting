import type { TSESLint, TSESTree } from '@typescript-eslint/utils'

export function rangeToDiff(node: TSESTree.Node, sourceCode: TSESLint.SourceCode): number {
	let nodeText = sourceCode.getText(node)
	let hasTrailingCommaOrSemicolon = nodeText.endsWith(';') || nodeText.endsWith(',')
	let [from, to] = node.range

	return to - from - (hasTrailingCommaOrSemicolon ? 1 : 0)
}

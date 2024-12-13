import type { TSESTree } from '@typescript-eslint/utils'

export function isNodeEslintDisabled(node: TSESTree.Node, eslintDisabledLines: number[]): boolean {
	return eslintDisabledLines.includes(node.loc.start.line)
}

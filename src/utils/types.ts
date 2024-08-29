import type { TSESTree } from '@typescript-eslint/utils'

export interface SortingNode<Node extends TSESTree.Node = TSESTree.Node> {
	name: string
	node: Node
	dependencies?: string[]
	group?: string
	hasMultipleImportDeclarations?: boolean
}

export type Group =
	| 'unassigned'
	| 'builtin'
	| 'framework'
	| 'external'
	| 'internal'
	| 'local'
	| 'style'
	| 'object'
	| 'unknown'

export interface Options {
	groups: Group[]
	ignoreCase: boolean
	newlinesBetween: 'ignore' | 'always' | 'never'
	order: 'asc' | 'desc'
	type: 'alphabetical' | 'natural'
}

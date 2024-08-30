import type { TSESTree } from '@typescript-eslint/utils'

import type { IMPORT_GROUPS } from '../rules/new-order.js'

export type ImportDeclarationNode =
	| TSESTree.TSImportEqualsDeclaration
	| TSESTree.VariableDeclaration
	| TSESTree.ImportDeclaration

export interface SortingNode<Node extends TSESTree.Node = TSESTree.Node> {
	name: string
	node: Node
	dependencies?: string[]
	group?: string
	hasMultipleImportDeclarations?: boolean
}

export type ImportGroup = (typeof IMPORT_GROUPS)[number]
export type ImportGroups = typeof IMPORT_GROUPS

export interface Options {
	ignoreCase: boolean
	newlinesBetween: 'ignore' | 'always' | 'never'
	order: 'asc' | 'desc'
	type: 'alphabetical' | 'natural'
}

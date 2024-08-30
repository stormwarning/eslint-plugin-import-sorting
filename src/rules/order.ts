import { AST_NODE_TYPES, ESLintUtils, type TSESLint, type TSESTree } from '@typescript-eslint/utils'
import type { ImportDeclaration } from 'estree'

import { mutateRanksToAlphabetize } from '../utils/old/alphabetize-ranks.js'
import { makeNewlinesBetweenReport } from '../utils/old/make-newlines-between-report.js'
import { makeOutOfOrderReport } from '../utils/old/make-out-of-order-report.js'
import { resolveImportGroup } from '../utils/old/resolve-import-group.js'

const IMPORT_GROUPS = [
	'builtin',
	'framework',
	'thirdparty',
	'firstparty',
	'local',
	'style',
	'unknown',
] as const

type ImportGroup = (typeof IMPORT_GROUPS)[number]
type GroupRankMap = Record<(typeof IMPORT_GROUPS)[number], number>

export type ImportNode = (TSESTree.ImportDeclaration | TSESTree.TSImportEqualsDeclaration) & {
	parent: TSESTree.Node
}

type ImportName = ImportDeclaration['source']['value']

export interface ImportNodeObject {
	node: ImportNode // & { importKind?: string }
	value: ImportName
	displayName: ImportName
	type: 'import' | 'import:object'
	rank: number
}

interface RankObject {
	groups: GroupRankMap
	omittedTypes: ImportGroup[]
}

function computeRank(
	settings: TSESLint.SharedConfigurationSettings,
	importEntry: ImportNodeObject,
	ranks: RankObject,
) {
	let kind: ImportGroup = resolveImportGroup(importEntry.value as string, settings)
	let rank: number

	/**
	 * @todo Update to allow `type` as a group.
	 */
	// if (importEntry.type === 'import:object') {
	// 	kind = 'object'
	// } else if (importEntry.node.importKind === 'type' && !ranks.omittedTypes.includes('type')) {
	// 	kind = 'type'
	// } else {
	// 	kind = resolveImportGroup(importEntry.value, context)
	// }

	rank = ranks.groups[kind]

	if (importEntry.type !== 'import' && !importEntry.type.startsWith('import:')) {
		rank += 100
	}

	return rank
}

function registerNode(
	settings: TSESLint.SharedConfigurationSettings,
	importEntry: ImportNodeObject,
	ranks: RankObject,
	imported?: unknown[],
) {
	let rank = computeRank(settings, importEntry, ranks)
	if (rank !== -1) {
		imported?.push({ ...importEntry, rank })
	}
}

function convertGroupsToRanks(groups: typeof IMPORT_GROUPS) {
	let rankObject = groups.reduce((result, group, index) => {
		for (let groupItem of [group].flat()) {
			if (!IMPORT_GROUPS.includes(groupItem)) {
				throw new Error(
					`Incorrect configuration of the rule: Unknown type \`${JSON.stringify(
						groupItem,
					)}\``,
				)
			}

			if (result[groupItem] !== undefined) {
				throw new Error(
					`Incorrect configuration of the rule: \`${groupItem}\` is duplicated`,
				)
			}

			result[groupItem] = index * 2
		}

		return result
	}, {} as GroupRankMap)

	let omittedTypes = IMPORT_GROUPS.filter((type) => rankObject[type] === undefined)

	let ranks = omittedTypes.reduce((result, type) => {
		result[type] = groups.length * 2
		return result
	}, rankObject)

	return { groups: ranks, omittedTypes }
}

// eslint-disable-next-line new-cap
const createRule = ESLintUtils.RuleCreator(
	(name) =>
		`https://github.com/stormwarning/eslint-plugin-import-sorting/blob/main/docs/rules/${name}.md`,
)

export default createRule({
	name: 'order',
	meta: {
		type: 'layout',
		fixable: 'code',
		docs: {
			description: 'Enforce a convention in the order of `import` statements.',
		},
		messages: {
			'needs-newline': 'There should be at least one empty line between import groups',
			'extra-newline': 'There should be no empty line between import groups',
			'extra-newline-in-group': 'There should be no empty line within import group',
			'out-of-order': '{{secondImport}} should occur {{order}} {{firstImport}}',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		let importMap = new Map<ImportNode, ImportNodeObject[]>()
		let { groups, omittedTypes } = convertGroupsToRanks(IMPORT_GROUPS)
		let ranks: RankObject = {
			groups,
			omittedTypes,
		}

		function getBlockImports(node: ImportNode) {
			if (!importMap.has(node)) {
				importMap.set(node, [])
			}

			return importMap.get(node)
		}

		return {
			ImportDeclaration(node) {
				// Ignore unassigned imports.
				if (node.specifiers.length > 0) {
					let name = node.source.value
					registerNode(
						context.settings,
						{
							node,
							value: name,
							displayName: name,
							type: 'import',
							/** @todo Check that setting this to a value doesn't cause problems. */
							rank: 0,
						},
						ranks,
						/** @todo Maybe get better types for `parent` property? */
						getBlockImports(node.parent as ImportNode),
					)
				}
			},
			TSImportEqualsDeclaration(node) {
				// @ts-expect-error -- Probably don't need this check.
				if (node.isExport) return

				let displayName: string
				let value: string
				let type: 'import' | 'import:object'

				if (node.moduleReference.type === AST_NODE_TYPES.TSExternalModuleReference) {
					/** @todo Not sure how to properly type this property. */
					// @ts-expect-error -- Need a narrower type for `expression` property.
					value = node.moduleReference.expression.value as string
					displayName = value
					type = 'import'
				} else {
					value = ''
					displayName = context.sourceCode.getText(node.moduleReference)
					type = 'import:object'
				}

				registerNode(
					context,
					{
						node,
						value,
						displayName,
						type,
						/** @todo Check that setting this to a value doesn't cause problems. */
						rank: 0,
					},
					ranks,
					/** @todo Maybe get better types for `parent` property? */
					getBlockImports(node.parent as ImportNode),
				)
			},
			'Program:exit'() {
				// This is using the Map `forEach` method, not the array method.
				// eslint-disable-next-line unicorn/no-array-for-each
				importMap.forEach((imported) => {
					makeNewlinesBetweenReport(context, imported, 'always')
					mutateRanksToAlphabetize(imported, 'asc')
					makeOutOfOrderReport(context, imported)
				})

				importMap.clear()
			},
		}
	},
})

import type { Rule } from 'eslint'
import type { ImportDeclaration } from 'estree'

import { mutateRanksToAlphabetize } from '../utils/alphabetize-ranks'
import { makeNewlinesBetweenReport } from '../utils/make-newlines-between-report'
import { makeOutOfOrderReport } from '../utils/make-out-of-order-report'
import { resolveImportGroup } from '../utils/resolve-import-group'

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

export type ImportNode = ImportDeclaration & Rule.NodeParentExtension

type ImportName = ImportDeclaration['source']['value']

export interface ImportNodeObject {
	node: Rule.Node & { importKind?: string }
	value: ImportName
	displayName: ImportName
	type: 'import' | 'import:'
	rank: number
}

interface RankObject {
	groups: GroupRankMap
	omittedTypes: ImportGroup[]
}

function computeRank(
	context: Rule.RuleContext,
	importEntry: Omit<ImportNodeObject, 'rank'>,
	ranks: RankObject,
) {
	let kind: ImportGroup = resolveImportGroup(importEntry.value as string, context)
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
	context: Rule.RuleContext,
	importEntry: Omit<ImportNodeObject, 'rank'>,
	ranks: RankObject,
	imported,
) {
	let rank = computeRank(context, importEntry, ranks)
	if (rank !== -1) {
		imported.push({ ...importEntry, rank })
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

export const sortImports: Rule.RuleModule = {
	meta: {
		type: 'layout',
		fixable: 'code',
	},
	schema: [
		{
			type: 'object',
		},
	],
	create(context) {
		let importMap: Map<Rule.Node, Array<ImportNodeObject>> = new Map()
		let { groups, omittedTypes } = convertGroupsToRanks(IMPORT_GROUPS)
		let ranks: RankObject = {
			groups,
			omittedTypes,
		}

		function getBlockImports(node: Rule.Node) {
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
						context,
						{
							node,
							value: name,
							displayName: name,
							type: 'import',
						},
						ranks,
						getBlockImports(node.parent),
					)
				}
			},
			TSImportEqualsDeclaration(node: ImportNode) {
				if (node.isExport) return

				let displayName
				let value
				let type

				if (node.moduleReference.type === 'TSExternalModuleReference') {
					value = node.moduleReference.expression.value
					displayName = value
					type = 'import'
				} else {
					value = ''
					displayName = context.getSourceCode().getText(node.moduleReference)
					type = 'import:object'
				}

				registerNode(
					context,
					{
						node,
						value,
						displayName,
						type,
					},
					ranks,
					getBlockImports(node.parent),
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
}

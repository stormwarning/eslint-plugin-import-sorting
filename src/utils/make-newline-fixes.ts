import type { TSESLint } from '@typescript-eslint/utils'

import { IMPORT_GROUPS } from '../rules/order.js'
import { getGroupNumber } from './get-group-number.js'
import { getLinesBetween } from './get-lines-between.js'
import { getNodeRange } from './get-node-range.js'
import type { SortingNode } from './types.js'

interface MakeNewlineFixesParameters {
	fixer: TSESLint.RuleFixer
	nodes: SortingNode[]
	sortedNodes: SortingNode[]
	sourceCode: TSESLint.SourceCode
	options: {
		newlinesBetween: 'ignore' | 'always' | 'never'
	}
}

export function makeNewlineFixes({
	fixer,
	nodes,
	sortedNodes,
	sourceCode,
	options,
}: MakeNewlineFixesParameters): TSESLint.RuleFix[] {
	let fixes: TSESLint.RuleFix[] = []

	for (let max = sortedNodes.length, index = 0; index < max; index++) {
		let sortingNode = sortedNodes.at(index)!
		let nextSortingNode = sortedNodes.at(index + 1)

		if (options.newlinesBetween === 'ignore' || !nextSortingNode) {
			continue
		}

		let nodeGroupNumber = getGroupNumber(IMPORT_GROUPS, sortingNode)
		let nextNodeGroupNumber = getGroupNumber(IMPORT_GROUPS, nextSortingNode)
		let currentNodeRange = getNodeRange(nodes.at(index)!.node, sourceCode)
		let nextNodeRangeStart = getNodeRange(nodes.at(index + 1)!.node, sourceCode).at(0)!
		let rangeToReplace: [number, number] = [currentNodeRange.at(1)!, nextNodeRangeStart]
		let textBetweenNodes = sourceCode.text.slice(currentNodeRange.at(1), nextNodeRangeStart)

		let linesBetweenMembers = getLinesBetween(
			sourceCode,
			nodes.at(index)!,
			nodes.at(index + 1)!,
		)

		let rangeReplacement: undefined | string
		if (
			(options.newlinesBetween === 'always' &&
				nodeGroupNumber === nextNodeGroupNumber &&
				linesBetweenMembers !== 0) ||
			(options.newlinesBetween === 'never' && linesBetweenMembers > 0)
		) {
			rangeReplacement = getStringWithoutInvalidNewlines(textBetweenNodes)
		}

		if (
			options.newlinesBetween === 'always' &&
			nodeGroupNumber !== nextNodeGroupNumber &&
			linesBetweenMembers !== 1
		) {
			rangeReplacement = addNewlineBeforeFirstNewline(
				linesBetweenMembers > 1
					? getStringWithoutInvalidNewlines(textBetweenNodes)
					: textBetweenNodes,
			)
			let isOnSameLine =
				linesBetweenMembers === 0 &&
				nodes.at(index)!.node.loc.end.line === nodes.at(index + 1)!.node.loc.start.line
			if (isOnSameLine) {
				rangeReplacement = addNewlineBeforeFirstNewline(rangeReplacement)
			}
		}

		if (rangeReplacement) {
			fixes.push(fixer.replaceTextRange(rangeToReplace, rangeReplacement))
		}
	}

	return fixes
}

function getStringWithoutInvalidNewlines(value: string): string {
	return value.replaceAll(/\n\s*\n/gu, '\n').replaceAll(/\n+/gu, '\n')
}

function addNewlineBeforeFirstNewline(value: string): string {
	let firstNewlineIndex = value.indexOf('\n')

	if (firstNewlineIndex === -1) return `${value}\n`

	return `${value.slice(0, firstNewlineIndex)}\n${value.slice(firstNewlineIndex)}`
}

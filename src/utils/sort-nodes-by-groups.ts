import { IMPORT_GROUPS } from '../rules/order.js'
import type { CompareOptions } from './compare.js'
import { getGroupNumber } from './get-group-number.js'
import { sortNodes } from './sort-nodes.js'
import type { SortingNode } from './types.js'

interface ExtraOptions<T extends SortingNode> {
	/**
	 * If not provided, `options` will be used.  If function returns undefined,
	 * nodes will not be sorted within the group.
	 */
	getGroupCompareOptions?(groupNumber: number): CompareOptions<T> | undefined
	// eslint-disable-next-line @typescript-eslint/member-ordering
	ignoreEslintDisabledNodes?: boolean
	isNodeIgnored?(node: T): boolean
}

export function sortNodesByGroups<T extends SortingNode>(
	nodes: T[],
	options: CompareOptions<T>,
	extraOptions?: ExtraOptions<T>,
): T[] {
	let nodesByNonIgnoredGroupNumber: Record<number, T[]> = {}
	let ignoredNodeIndices: number[] = []

	for (let [index, sortingNode] of nodes.entries()) {
		if (
			(sortingNode.isEslintDisabled && extraOptions?.ignoreEslintDisabledNodes) ??
			extraOptions?.isNodeIgnored?.(sortingNode)
		) {
			ignoredNodeIndices.push(index)
			continue
		}

		let groupNumber = getGroupNumber(IMPORT_GROUPS, sortingNode)
		nodesByNonIgnoredGroupNumber[groupNumber] ??= []
		nodesByNonIgnoredGroupNumber[groupNumber].push(sortingNode)
	}

	let sortedNodes: T[] = []
	for (let groupNumber of Object.keys(nodesByNonIgnoredGroupNumber).sort(
		(a, b) => Number(a) - Number(b),
	)) {
		let compareOptions = extraOptions?.getGroupCompareOptions
			? extraOptions.getGroupCompareOptions(Number(groupNumber))
			: options

		if (!compareOptions) {
			sortedNodes.push(...nodesByNonIgnoredGroupNumber[Number(groupNumber)])
			continue
		}

		sortedNodes.push(
			...sortNodes(nodesByNonIgnoredGroupNumber[Number(groupNumber)], compareOptions),
		)
	}

	// Add ignored nodes at the same position as they were before linting.
	for (let ignoredIndex of ignoredNodeIndices) {
		sortedNodes.splice(ignoredIndex, 0, nodes[ignoredIndex])
	}

	return sortedNodes
}

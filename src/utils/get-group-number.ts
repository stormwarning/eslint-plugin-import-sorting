import type { Group, SortingNode } from './types.js'

export function getGroupNumber(groups: Group[], node: SortingNode): number {
	for (let max = groups.length, index = 0; index < max; index++) {
		let currentGroup = groups[index]

		if (
			node.group === currentGroup ||
			(Array.isArray(currentGroup) &&
				typeof node.group === 'string' &&
				currentGroup.includes(node.group))
		) {
			return index
		}
	}

	return groups.length
}

import type { Group } from './types'

export function useGroups(groups: string[]) {
	let group: undefined | string
	// For lookup performance
	let groupsSet = new Set(groups.flat())

	let defineGroup = (value: Group, override = false) => {
		if ((!group || override) && groupsSet.has(value)) {
			group = value
		}
	}

	return {
		getGroup: () => group ?? 'unknown',
		defineGroup,
	}
}

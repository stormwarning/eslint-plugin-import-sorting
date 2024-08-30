import type { ImportGroup, ImportGroups } from './types.js'

export function useGroups(groups: ImportGroups) {
	let group: undefined | ImportGroup
	// For lookup performance
	let groupsSet = new Set(groups.flat())

	let defineGroup = (value: ImportGroup, override = false) => {
		if ((!group || override) && groupsSet.has(value)) {
			group = value
		}
	}

	return {
		getGroup: () => group ?? 'unknown',
		defineGroup,
	}
}

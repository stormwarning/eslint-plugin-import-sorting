import groupBy from 'object.groupby'

import type { ImportNodeObject } from '../../rules/order.js'

type OrderDirection = 'asc' | 'desc'

/**
 * Some parsers (languages without types) don't provide ImportKind.
 */
const DEFAULT_IMPORT_KIND = 'value'

/**
 * @todo Maybe add option to choose between 'natural' and 'literal' sorting.
 */
function compareString(first: string, second: string) {
	return first.localeCompare(second, 'en', { numeric: true })
}

function compareDotSegments(first: string, second: string) {
	let regex = /\.+(?=\/)/g

	let firstCount = (first.match(regex) ?? []).join('').length
	let secondCount = (second.match(regex) ?? []).join('').length

	if (secondCount < firstCount) return -1
	if (firstCount < secondCount) return 1

	// If segment length is the same, compare the path alphabetically.
	return compareString(first, second)
}

function getSorter(order: OrderDirection) {
	let multiplier = order === 'asc' ? 1 : -1
	let multiplierImportKind = order === 'asc' ? 1 : -1

	return function (nodeA: ImportNodeObject, nodeB: ImportNodeObject) {
		let importA = String(nodeA.value)
		let importB = String(nodeB.value)
		let result = 0

		if (importA.startsWith('.') && importB.startsWith('.')) {
			result = compareDotSegments(importA, importB)
		} else if (!importA.includes('/') && !importB.includes('/')) {
			result = compareString(importA, importB)
		} else {
			let A = importA.split('/')
			let B = importB.split('/')
			let a = A.length
			let b = B.length

			for (let index = 0; index < Math.min(a, b); index++) {
				result = compareString(A[index], B[index])
				if (result) {
					break
				}
			}

			if (!result && a !== b) {
				result = a < b ? -1 : 1
			}
		}

		result *= multiplier

		// In case the paths are equal (result === 0), sort them by importKind.
		if (!result && multiplierImportKind) {
			result =
				multiplierImportKind *
				compareString(
					nodeA.node.importKind ?? DEFAULT_IMPORT_KIND,
					nodeB.node.importKind ?? DEFAULT_IMPORT_KIND,
				)
		}

		return result
	}
}

export function mutateRanksToAlphabetize(
	imported: ImportNodeObject[],
	alphabetizeOptions: OrderDirection,
) {
	let groupedByRanks = groupBy(imported, (item) => item.rank)
	let sorterFunction = getSorter(alphabetizeOptions)

	// Sort group keys so that they can be iterated on in order.
	let groupRanks = Object.keys(groupedByRanks).sort((a, b) => Number(a) - Number(b))

	// Sort imports locally within their group.
	for (let groupRank of groupRanks) {
		groupedByRanks[groupRank].sort(sorterFunction)
	}

	// Assign a globally unique rank to each import.
	let newRank = 0
	let alphabetizedRanks = groupRanks.reduce<Record<string, number>>((accumulator, groupRank) => {
		for (let importedItem of groupedByRanks[groupRank]) {
			accumulator[`${importedItem.value}|${importedItem.node.importKind}`] =
				Number.parseInt(groupRank, 10) + newRank
			newRank += 1
		}

		return accumulator
	}, {})

	// Mutate the original group-rank with alphabetized-rank.
	for (let importedItem of imported) {
		importedItem.rank =
			alphabetizedRanks[`${importedItem.value}|${importedItem.node.importKind}`]
	}
}

/* eslint-disable unicorn/no-array-for-each */

import path from 'node:path'

import groupBy from 'object.groupby'

import type { ImportNodeObject } from '../rules/sort-imports'

type OrderDirection = 'asc' | 'desc'

/**
 * Some parsers (languages without types) don't provide ImportKind.
 */
const DEFAULT_IMPORT_KIND = 'value'

/**
 * @todo Maybe add option to choose between 'natural' and 'literal' sorting.
 */
function compareString(first: string, second: string) {
	//
	// if (first < second) {
	// 	return -1
	// }

	// if (first > second) {
	// 	return 1
	// }

	// return 0
	return first.localeCompare(second, 'en')
}

function compareDotSegments(first: string, second: string) {
	let regex = /\.+(?=\/)/g

	let firstCount = (first.match(regex) || []).join('').length
	let secondCount = (second.match(regex) || []).join('').length

	if (firstCount > secondCount) return -1
	if (firstCount < secondCount) return 1

	console.log('SEGMENT COUNT IS EQUAL')

	// If segment length is the same, compare the basename alphabetically.
	return compareString(path.basename(first), path.basename(second))
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

		// In case the paths are equal (result === 0), sort them by importKind
		if (!result && multiplierImportKind) {
			result =
				multiplierImportKind *
				compareString(
					nodeA.node.importKind || DEFAULT_IMPORT_KIND,
					nodeB.node.importKind || DEFAULT_IMPORT_KIND,
				)
		}

		return result
	}
}

export function mutateRanksToAlphabetize(imported: ImportNodeObject[], alphabetizeOptions) {
	let groupedByRanks: Record<number, ImportNodeObject[]> = groupBy(
		imported,
		(item: ImportNodeObject) => item.rank,
	)

	let sorterFunction = getSorter(alphabetizeOptions)

	// Sort group keys so that they can be iterated on in order
	let groupRanks = Object.keys(groupedByRanks).sort((a, b) => Number(a) - Number(b))

	// Sort imports locally within their group
	groupRanks.forEach((groupRank) => {
		groupedByRanks[groupRank].sort(sorterFunction)
	})

	// Assign globally unique rank to each import
	let newRank = 0
	let alphabetizedRanks = groupRanks.reduce((accumulator, groupRank) => {
		groupedByRanks[groupRank].forEach((importedItem: ImportNodeObject) => {
			accumulator[`${importedItem.value}|${importedItem.node.importKind}`] =
				Number.parseInt(groupRank, 10) + newRank
			newRank += 1
		})
		return accumulator
	}, {})
	console.log('ALPHARANKS', alphabetizedRanks)

	// Mutate the original group-rank with alphabetized-rank
	imported.forEach((importedItem) => {
		importedItem.rank =
			alphabetizedRanks[`${importedItem.value}|${importedItem.node.importKind}`]
	})
}

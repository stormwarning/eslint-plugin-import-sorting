import type { SortingNode } from './types.js'

interface BaseCompareOptions {
	/**
	 * Custom function to get the value of the node.  By default, returns the
	 * node's name.
	 */
	nodeValueGetter?: (node: SortingNode) => string
	order: 'desc' | 'asc'
}

interface NaturalCompareOptions extends BaseCompareOptions {
	ignoreCase?: boolean
	type: 'natural'
}

export type CompareOptions = NaturalCompareOptions

export function compare(a: SortingNode, b: SortingNode, options: CompareOptions): number {
	/** Don't sort unsassigned imports. */
	if (a.group === 'unassigned' || b.group === 'unassigned') return 0

	if (b.dependencies?.includes(a.name)) return -1
	if (a.dependencies?.includes(b.name)) return 1

	let orderCoefficient = options.order === 'asc' ? 1 : -1
	let sortingFunction: (a: SortingNode, b: SortingNode) => number

	let nodeValueGetter = options.nodeValueGetter ?? ((node: SortingNode) => node.name)

	sortingFunction = (aNode, bNode) => {
		let aImport = stripProtocol(nodeValueGetter(aNode))
		let bImport = stripProtocol(nodeValueGetter(bNode))

		if (aImport.startsWith('.') && bImport.startsWith('.')) {
			return compareDotSegments(aImport, bImport)
		}

		return compareString(aImport, bImport)
	}

	return orderCoefficient * sortingFunction(a, b)
}

function stripProtocol(name: string) {
	return name.replace(/^(node|bun):/, '')
}

/**
 * Compare the two strings using `localeCompare` natural sorting.
 *
 * If one of the string arguments starts with a dot, it is sorted to the
 * bottom.  This ensures local imports come last within the `style` group.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/localeCompare
 */
function compareString(first: string, second: string) {
	if (first.startsWith('.') && !second.startsWith('.')) return 1
	if (!first.startsWith('.') && second.startsWith('.')) return -1
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

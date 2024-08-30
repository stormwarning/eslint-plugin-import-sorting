import type { SortingNode } from './types.js'

interface BaseCompareOptions {
	/**
	 * Custom function to get the value of the node. By default, returns the node's name.
	 */
	nodeValueGetter?: (node: SortingNode) => string
	order: 'desc' | 'asc'
}

interface AlphabeticalCompareOptions extends BaseCompareOptions {
	type: 'alphabetical'
	ignoreCase?: boolean
}

interface LineLengthCompareOptions extends BaseCompareOptions {
	maxLineLength?: number
	type: 'line-length'
}

interface NaturalCompareOptions extends BaseCompareOptions {
	ignoreCase?: boolean
	type: 'natural'
}

export type CompareOptions =
	| AlphabeticalCompareOptions
	// | LineLengthCompareOptions
	| NaturalCompareOptions

export function compare(a: SortingNode, b: SortingNode, options: CompareOptions): number {
	/** Don't sort unsassigned imports. */
	if (a.group === 'unassigned' || b.group === 'unassigned') return 0

	if (b.dependencies?.includes(a.name)) return -1
	if (a.dependencies?.includes(b.name)) return 1

	let orderCoefficient = options.order === 'asc' ? 1 : -1
	let sortingFunction: (a: SortingNode, b: SortingNode) => number

	let formatString = options.ignoreCase
		? (string: string) => string.toLowerCase()
		: (string: string) => string

	let nodeValueGetter = options.nodeValueGetter ?? ((node: SortingNode) => node.name)

	if (options.type === 'alphabetical') {
		sortingFunction = (aNode, bNode) =>
			formatString(nodeValueGetter(aNode)).localeCompare(formatString(nodeValueGetter(bNode)))
	} else if (options.type === 'natural') {
		let prepareNumeric = (string: string) => {
			let formattedNumberPattern = /^[+-]?[\d ,_]+(\.[\d ,_]+)?$/
			if (formattedNumberPattern.test(string)) {
				return string.replaceAll(/[ ,_]/g, '')
			}

			return string
		}

		sortingFunction = (aNode, bNode) => {
			let aImport = stripProtocol(nodeValueGetter(aNode))
			let bImport = stripProtocol(nodeValueGetter(bNode))

			if (aImport.startsWith('.') && bImport.startsWith('.')) {
				return compareDotSegments(aImport, bImport)
			}

			return compareString(aImport, bImport)
		}
		//
		// naturalCompare(
		// 	prepareNumeric(formatString(nodeValueGetter(aNode))),
		// 	prepareNumeric(formatString(nodeValueGetter(bNode))),
		// )
	} else {
		sortingFunction = (aNode, bNode) => {
			let aSize = aNode.size
			let bSize = bNode.size

			let { maxLineLength } = options

			if (maxLineLength) {
				let isTooLong = (size: number, node: SortingNode) =>
					size > maxLineLength && node.hasMultipleImportDeclarations

				if (isTooLong(aSize, aNode)) {
					aSize = nodeValueGetter(aNode).length + 10
				}

				if (isTooLong(bSize, bNode)) {
					bSize = nodeValueGetter(bNode).length + 10
				}
			}

			return aSize - bSize
		}
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

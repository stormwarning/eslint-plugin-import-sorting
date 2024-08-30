import { compare, type CompareOptions } from './compare.js'
import type { SortingNode } from './types.js'

export function sortNodes<T extends SortingNode>(nodes: T[], options: CompareOptions): T[] {
	return [...nodes].sort((a, b) => compare(a, b, options))
}

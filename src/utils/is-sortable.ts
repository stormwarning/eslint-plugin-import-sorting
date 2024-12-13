export function isSortable(node: unknown): boolean {
	return Array.isArray(node) && node.length > 1
}

import type { Rule } from 'eslint'

export function findRootNode(node: Rule.Node) {
	let parent = node

	// eslint-disable-next-line no-eq-null, eqeqeq
	while (parent.parent != null && parent.parent.body == null) {
		parent = parent.parent
	}

	return parent
}

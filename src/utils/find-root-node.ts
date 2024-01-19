import type { ImportNode } from '../rules/order.js'

export function findRootNode(node: ImportNode) {
	let parent = node

	/** @todo Not sure how to properly type `parent` property. */
	// @ts-expect-error -- Types don't account for `body` property on `parent`.
	// eslint-disable-next-line no-eq-null, eqeqeq
	while (parent.parent != null && parent.parent.body == null) {
		parent = parent.parent as ImportNode
	}

	return parent
}

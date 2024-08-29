export function pairwise<T>(nodes: T[], callback: (left: T, right: T, iteration: number) => void) {
	if (nodes.length > 1) {
		for (let index = 1; index < nodes.length; index++) {
			let left = nodes.at(index - 1)
			let right = nodes.at(index)

			if (left && right) {
				callback(left, right, index - 1)
			}
		}
	}
}

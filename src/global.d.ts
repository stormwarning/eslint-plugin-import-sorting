/**
 * @todo [-object.groupby] When the `groupBy` method is available natively,
 *       this declaration can be removed.
 */
declare module 'object.groupby' {
	import groupBy from 'object.groupby'

	function groupBy<T>(
		array: T[],
		predicate: (item: T) => string | number,
	): Record<string | number, T[]>

	export = groupBy
}

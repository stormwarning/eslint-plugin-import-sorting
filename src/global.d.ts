/**
 * @todo [engine:node@>21] When the `groupBy` method is available natively,
 *       this declaration (and polyfill) can be removed.
 */
declare module 'object.groupby' {
	import groupBy from 'object.groupby'

	function groupBy<T>(items: Iterable<T>, callback: (item: T) => key): Record<key, T[]>

	export = groupBy
}

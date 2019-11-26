/**
 * Like `Array.prototype.flatMap`, had it been available.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function flatMap(array, fn): any[] {
    return [].concat(...array.map(fn))
}

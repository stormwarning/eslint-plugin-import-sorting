/**
 * Like `Array.prototype.findIndex`, but searches from the end.
 */
export function findLastIndex(array, fn) {
    for (let index = array.length - 1; index >= 0; index--) {
        if (fn(array[index], index, array)) {
            return index
        }
    }
    // There are currently no usages of `findLastIndex` where nothing is found.
    // istanbul ignore next
    return -1
}

/**
 * Like `Array.prototype.flatMap`, had it been available.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function flatMap(array, fn): any[] {
    return [].concat(...array.map(fn))
}

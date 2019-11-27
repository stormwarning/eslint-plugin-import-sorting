const collator = new Intl.Collator('en', {
    sensitivity: 'base',
    numeric: true,
})

function compare(a: string, b: string): number {
    return collator.compare(a, b) || (a < b ? -1 : a > b ? 1 : 0)
}

export function getImportKind(importNode) {
    /**
     * Flow `type` and `typeof` imports. Default to "\uffff" to make regular
     * imports come after the type imports.
     */
    return importNode.importKind || '\uffff'
}

export function getSource(importNode) {
    let source = importNode.source.value

    return {
        source:
            /**
             * Due to "." sorting before "/" by default, relative imports are
             * automatically sorted in a logical manner for us: Imports from
             * files further up come first, with deeper imports last. There’s
             * one exception, though: When the `from` part ends with one or two
             * dots: "." and "..". Those are supposed to sort just like "./",
             * "../". So add in the slash for them. (No special handling is done
             * for cases like "./a/.." because nobody writes that anyway.)
             */
            source === '.' || source === '..' ? `${source}/` : source,
        originalSource: source,
        importKind: getImportKind(importNode),
    }
}

export function sortImportItems(items) {
    return items.slice().sort((itemA, itemB) =>
        // If both items are side effect imports, keep their original order.
        itemA.isSideEffectImport && itemB.isSideEffectImport
            ? 0
            : // If one of the items is a side effect import, move it first.
            itemA.isSideEffectImport
            ? -1
            : itemB.isSideEffectImport
            ? 1
            : // Compare the `from` part.
              compare(itemA.source.source, itemB.source.source) ||
              /**
               * The `.source` has been slightly tweaked. To stay fully
               * deterministic, also sort on the original value.
               */
              compare(
                  itemA.source.originalSource,
                  itemB.source.originalSource
              ) ||
              // Then put Flow type imports before regular ones.
              compare(itemA.source.importKind, itemB.source.importKind) ||
              /**
               * Keep the original order if the sources are the same. It's not
               * worth trying to compare anything else, and you can use
               * `import/no-duplicates` to get rid of the problem anyway.
               */
              itemA.index - itemB.index
    )
}

export function sortSpecifierItems(items) {
    return items.slice().sort(
        (itemA, itemB) =>
            // Put Flow type imports before regular ones.
            compare(getImportKind(itemA.node), getImportKind(itemB.node)) ||
            // Then compare by name.
            compare(itemA.node.imported.name, itemB.node.imported.name) ||
            // Then compare by the `as` name.
            compare(itemA.node.local.name, itemB.node.local.name) ||
            /**
             * Keep the original order if the names are the same. It's not worth
             * trying to compare anything else, `import {a, a} from "mod"` is a
             * syntax error anyway (but babel-eslint kind of supports it).
             */
            // istanbul ignore next
            itemA.index - itemB.index
    )
}

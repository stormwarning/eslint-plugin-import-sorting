import { ImportDeclaration, Literal } from 'estree'

export interface ImportSource {
    source: string | boolean | number | RegExp | null
    originalSource: string | boolean | number | RegExp | null
    // importKind
}

export interface ImportItem {
    node: ImportDeclaration
    code: string
    start: number
    end: number
    source: ImportSource
    hasSideEffects: boolean
    needsNewline: boolean
}

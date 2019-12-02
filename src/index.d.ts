import { AST } from 'eslint'
import { Comment, ImportDeclaration, MethodDefinition } from 'estree'

export interface ImportWhitespace {
    type: 'Literal' | string // 'Spaces' | 'Newline'
    code?: string // ' ' | '\r\n' | '\n'

    //
    value?: null
    key?: null
    kind?: null
    computed?: null
    static?: null
}

export type ImportToken = AST.Token | Comment | ImportWhitespace

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

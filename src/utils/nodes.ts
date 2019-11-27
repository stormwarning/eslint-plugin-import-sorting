import { Node, ImportDeclaration, Comment } from 'estree'
import { SourceCode, AST } from 'eslint'

export function isImport(node: Node): boolean {
    return node.type === 'ImportDeclaration'
}

/**
 * import def, { a, b as c, type d } from "A"
 *               ^  ^^^^^^  ^^^^^^
 */
export function isImportSpecifier(node: Node): boolean {
    return node.type === 'ImportSpecifier'
}

export function isIdentifier(node: Node): boolean {
    return node.type === 'Identifier'
}

export function isPunctuator(node: AST.Token, value: string): boolean {
    return node.type === 'Punctuator' && node.value === value
}

export function isBlockComment(node: Comment): boolean {
    return node.type === 'Block'
}

export function isLineComment(node: Comment): boolean {
    return node.type === 'Line'
}

export function isSpaces(node): boolean {
    return node.type === 'Spaces'
}

export function isNewline(node): boolean {
    return node.type === 'Newline'
}

/**
 * import "setup"
 * But not: import {} from "setup"
 * And not: import type {} from "setup"
 */
export function isSideEffectImport(
    importNode,
    sourceCode: SourceCode
): boolean {
    return (
        importNode.specifiers.length === 0 &&
        !importNode.importKind &&
        !isPunctuator(sourceCode.getFirstToken(importNode, { skip: 1 }), '{')
    )
}

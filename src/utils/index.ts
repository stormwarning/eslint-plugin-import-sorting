import { Node, Comment } from 'estree'
import { SourceCode } from 'eslint'
import { isSpaces } from './nodes'

const NEWLINE = /(\r?\n)/

export function endsWithSpaces(tokens) {
    let last = tokens.length > 0 ? tokens[tokens.length - 1] : undefined
    return last == null ? false : isSpaces(last)
}

/**
 * Prints tokens that are enhanced with a `code` property – like those returned
 * by `getAllTokens` and `parseWhitespace`.
 */
export function printTokens(tokens): string {
    return tokens.map((token) => token.code).join('')
}

export function hasNewline(string): boolean {
    return NEWLINE.test(string)
}

export function guessNewline(sourceCode) {
    let match = NEWLINE.exec(sourceCode.text)
    return match == null ? '\n' : match[0]
}

export function parseWhitespace(whitespace) {
    let allItems = whitespace.split(NEWLINE)

    /**
     * Remove blank lines. `allItems` contains alternating `spaces` (which can
     * be the empty string) and `newline` (which is either "\r\n" or "\n"). So
     * in practice `allItems` grows like this as there are more newlines in
     * `whitespace`:
     *
     *     [spaces]
     *     [spaces, newline, spaces]
     *     [spaces, newline, spaces, newline, spaces]
     *     [spaces, newline, spaces, newline, spaces, newline, spaces]
     *
     * If there are 5 or more items we have at least one blank line. If so, keep
     * the first `spaces`, the first `newline` and the last `spaces`.
     */
    let items =
        allItems.length >= 5
            ? allItems.slice(0, 2).concat(allItems.slice(-1))
            : allItems

    return (
        items
            .map((spacesOrNewline, index) =>
                index % 2 === 0
                    ? { type: 'Spaces', code: spacesOrNewline }
                    : { type: 'Newline', code: spacesOrNewline }
            )
            // Remove empty spaces since it makes debugging easier.
            .filter((token) => token.code !== '')
    )
}

export function removeBlankLines(whitespace) {
    return printTokens(parseWhitespace(whitespace))
}

export function getIndentation(
    node: Node | Comment,
    sourceCode: SourceCode
): string {
    let tokenBefore = sourceCode.getTokenBefore(node, {
        includeComments: true,
    })

    if (tokenBefore == null) {
        let text = sourceCode.text.slice(0, node.range[0])
        let lines = text.split(NEWLINE)

        return lines[lines.length - 1]
    }

    let text = sourceCode.text.slice(tokenBefore.range[1], node.range[0])
    let lines = text.split(NEWLINE)

    return lines.length > 1 ? lines[lines.length - 1] : ''
}

export function getTrailingSpaces(
    node: Node | Comment,
    sourceCode: SourceCode
): string {
    let tokenAfter = sourceCode.getTokenAfter(node, {
        includeComments: true,
    })

    if (tokenAfter == null) {
        let text = sourceCode.text.slice(node.range[1])
        let lines = text.split(NEWLINE)

        return lines[0]
    }

    let text = sourceCode.text.slice(node.range[1], tokenAfter.range[0])
    let lines = text.split(NEWLINE)

    return lines[0]
}

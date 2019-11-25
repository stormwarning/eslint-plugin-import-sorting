const NEWLINE = /(\r?\n)/

/**
 * Prints tokens that are enhanced with a `code` property – like those returned
 * by `getAllTokens` and `parseWhitespace`.
 */
export function printTokens(tokens) {
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

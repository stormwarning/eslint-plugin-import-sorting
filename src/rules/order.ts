import { Rule, SourceCode, AST } from 'eslint'
import { ImportDeclaration, Node, Program, Comment } from 'estree'
import { isImport, isPunctuator, isImportSpecifier } from '../utils/nodes'
import determineImportType from '../utils/types'
import {
    removeBlankLines,
    getIndentation,
    getTrailingSpaces,
    parseWhitespace,
} from '../utils'
import flatMap from '../utils/flatmap'

type GroupName =
    | 'side-effect'
    | 'standard'
    | 'framework'
    | 'external'
    | 'firstparty'
    | 'local'
type ImportGroups = GroupName[]
const DEFAULT_GROUPS = [
    'side-effect',
    'standard',
    'framework',
    'external',
    'firstparty',
    'local',
]

function reverse(array) {
    return array
        .map(function(v) {
            return {
                name: v.name,
                rank: -v.rank,
                node: v.node,
            }
        })
        .reverse()
}

function getTokensOrCommentsBefore(sourceCode, node, count) {
    let currentNodeOrToken = node
    let result = []

    for (let i = 0; i < count; i++) {
        currentNodeOrToken = sourceCode.getTokenOrCommentBefore(
            currentNodeOrToken
        )

        if (currentNodeOrToken == null) break

        result.push(currentNodeOrToken)
    }

    return result.reverse()
}

function getTokensOrCommentsAfter(sourceCode, node, count) {
    let currentNodeOrToken = node
    let result = []

    for (let i = 0; i < count; i++) {
        currentNodeOrToken = sourceCode.getTokenOrCommentAfter(
            currentNodeOrToken
        )

        if (currentNodeOrToken == null) break

        result.push(currentNodeOrToken)
    }

    return result
}

function takeTokensBeforeWhile(sourceCode, node, condition) {
    let tokens = getTokensOrCommentsBefore(sourceCode, node, 100)
    let result = []

    for (let i = tokens.length - 1; i >= 0; i--) {
        if (condition(tokens[i])) {
            result.push(tokens[i])
        } else {
            break
        }
    }

    return result.reverse()
}

function takeTokensAfterWhile(sourceCode, node, condition) {
    let tokens = getTokensOrCommentsAfter(sourceCode, node, 100)
    let result = []

    for (let i = 0; i < tokens.length; i++) {
        if (condition(tokens[i])) {
            result.push(tokens[i])
        } else {
            break
        }
    }

    return result
}

function findOutOfOrder(imported) {
    if (imported.length === 0) return []

    let maxSeenRankNode = imported[0]

    return imported.filter(function(importedModule) {
        let res = importedModule.rank < maxSeenRankNode.rank

        if (maxSeenRankNode.rank < importedModule.rank) {
            maxSeenRankNode = importedModule
        }

        return res
    })
}

function findRootNode(node) {
    let parent = node

    while (parent.parent != null && parent.parent.body == null) {
        parent = parent.parent
    }

    return parent
}

function commentOnSameLineAs(node) {
    return (token) =>
        (token.type === 'Block' || token.type === 'Line') &&
        token.loc.start.line === token.loc.end.line &&
        token.loc.end.line === node.loc.end.line
}

function findStartOfLineWithComments(sourceCode, node): number {
    let tokensToEndOfLine = takeTokensBeforeWhile(
        sourceCode,
        node,
        commentOnSameLineAs(node)
    )
    let startOfTokens =
        tokensToEndOfLine.length > 0
            ? tokensToEndOfLine[0].range[0]
            : node.range[0]
    let result = startOfTokens

    for (let i = startOfTokens - 1; i > 0; i--) {
        if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
            break
        }

        result = i
    }

    return result
}

function findEndOfLineWithComments(sourceCode, node): number {
    let tokensToEndOfLine = takeTokensAfterWhile(
        sourceCode,
        node,
        commentOnSameLineAs(node)
    )
    let endOfTokens =
        tokensToEndOfLine.length > 0
            ? tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1]
            : node.range[1]
    let result = endOfTokens

    for (let i = endOfTokens; i < sourceCode.text.length; i++) {
        if (sourceCode.text[i] === '\n') {
            result = i + 1
            break
        }

        if (
            sourceCode.text[i] !== ' ' &&
            sourceCode.text[i] !== '\t' &&
            sourceCode.text[i] !== '\r'
        ) {
            break
        }

        result = i + 1
    }

    return result
}

function isPlainImportModule(node) {
    return (
        node.type === 'ImportDeclaration' &&
        node.specifiers != null &&
        node.specifiers.length > 0
    )
}

function isPlainRequireModule(node) {
    if (node.type !== 'VariableDeclaration') return false
    if (node.declarations.length !== 1) return false

    let decl = node.declarations[0]
    let result =
        decl.id &&
        (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
        decl.init != null &&
        decl.init.type === 'CallExpression' &&
        decl.init.callee != null &&
        decl.init.callee.name === 'require' &&
        decl.init.arguments != null &&
        decl.init.arguments.length === 1 &&
        decl.init.arguments[0].type === 'Literal'

    return result
}

function canCrossNodeWhileReorder(node) {
    return isPlainRequireModule(node) || isPlainImportModule(node)
}

function canReorderItems(firstNode, secondNode) {
    let parent = firstNode.parent
    let [firstIndex, secondIndex] = [
        parent.body.indexOf(firstNode),
        parent.body.indexOf(secondNode),
    ].sort()
    let nodesBetween = parent.body.slice(firstIndex, secondIndex + 1)

    for (let nodeBetween of nodesBetween) {
        if (!canCrossNodeWhileReorder(nodeBetween)) return false
    }

    return true
}

function fixOutOfOrder(context, firstNode, secondNode, order) {
    let sourceCode = context.getSourceCode()

    let firstRoot = findRootNode(firstNode.node)
    let firstRootStart = findStartOfLineWithComments(sourceCode, firstRoot)
    let firstRootEnd = findEndOfLineWithComments(sourceCode, firstRoot)

    let secondRoot = findRootNode(secondNode.node)
    let secondRootStart = findStartOfLineWithComments(sourceCode, secondRoot)
    let secondRootEnd = findEndOfLineWithComments(sourceCode, secondRoot)

    let canFix = canReorderItems(firstRoot, secondRoot)
    let newCode = sourceCode.text.substring(secondRootStart, secondRootEnd)

    if (newCode[newCode.length - 1] !== '\n') {
        newCode = newCode + '\n'
    }

    let message = `\`${secondNode.name}\` import should occur ${order} import of \`${firstNode.name}\``

    if (order === 'before') {
        context.report({
            node: secondNode.node,
            message: message,
            fix:
                canFix &&
                ((fixer) =>
                    fixer.replaceTextRange(
                        [firstRootStart, secondRootEnd],
                        newCode +
                            sourceCode.text.substring(
                                firstRootStart,
                                secondRootStart
                            )
                    )),
        })
    } else if (order === 'after') {
        context.report({
            node: secondNode.node,
            message: message,
            fix:
                canFix &&
                ((fixer) =>
                    fixer.replaceTextRange(
                        [secondRootStart, firstRootEnd],
                        sourceCode.text.substring(secondRootEnd, firstRootEnd) +
                            newCode
                    )),
        })
    }
}

function reportOutOfOrder(context, imported, outOfOrder, order) {
    outOfOrder.forEach(function(imp) {
        let found = imported.find(function hasHigherRank(importedItem) {
            return importedItem.rank > imp.rank
        })

        fixOutOfOrder(context, found, imp, order)
    })
}

function makeOutOfOrderReport(context, imported) {
    let outOfOrder = findOutOfOrder(imported)

    if (!outOfOrder.length) return

    // There are things to report. Try to minimize the number of reported errors.
    let reversedImported = reverse(imported)
    let reversedOrder = findOutOfOrder(reversedImported)

    if (reversedOrder.length < outOfOrder.length) {
        reportOutOfOrder(context, reversedImported, reversedOrder, 'after')
        return
    }

    reportOutOfOrder(context, imported, outOfOrder, 'before')
}

function computeRank(context, ranks, name, type) {
    return (
        ranks[determineImportType(name, context)] +
        (type === 'import' ? 0 : 100)
    )
}

function registerNode(context, node, name, type, ranks, imported) {
    let rank = computeRank(context, ranks, name, type)

    if (rank !== -1) {
        imported.push({ name, rank, node })
    }
}

const types = [
    'side-effect',
    'standard',
    'framework',
    'external',
    'unknown',
    'firstparty',
    'local',
]

// Creates an object with type-rank pairs.
// Example: { index: 0, sibling: 1, parent: 1, external: 1, builtin: 2, internal: 2 }
// Will throw an error if it contains a type that does not exist, or has a duplicate
function convertGroupsToRanks(groups) {
    let rankObject = groups.reduce(function(res, group, index) {
        if (typeof group === 'string') {
            group = [group]
        }

        group.forEach(function(groupItem) {
            if (types.indexOf(groupItem) === -1) {
                throw new Error(
                    'Incorrect configuration of the rule: Unknown type `' +
                        JSON.stringify(groupItem) +
                        '`'
                )
            }

            if (res[groupItem] !== undefined) {
                throw new Error(
                    'Incorrect configuration of the rule: `' +
                        groupItem +
                        '` is duplicated'
                )
            }

            res[groupItem] = index
        })

        return res
    }, {})

    let omittedTypes = types.filter(function(type) {
        return rankObject[type] === undefined
    })

    return omittedTypes.reduce(function(res, type) {
        res[type] = groups.length
        return res
    }, rankObject)
}

function fixNewLineAfterImport(context, previousImport): Function {
    let prevRoot = findRootNode(previousImport.node)
    let tokensToEndOfLine = takeTokensAfterWhile(
        context.getSourceCode(),
        prevRoot,
        commentOnSameLineAs(prevRoot)
    )
    let endOfLine = prevRoot.range[1]

    if (tokensToEndOfLine.length > 0) {
        endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1]
    }

    return (fixer: Rule.RuleFixer): Rule.Fix =>
        fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n')
}

function removeNewLineAfterImport(
    context,
    currentImport,
    previousImport
): Function | undefined {
    let sourceCode = context.getSourceCode()
    let prevRoot = findRootNode(previousImport.node)
    let currRoot = findRootNode(currentImport.node)
    let range: [number, number] = [
        findEndOfLineWithComments(sourceCode, prevRoot),
        findStartOfLineWithComments(sourceCode, currRoot),
    ]

    if (/^\s*$/.test(sourceCode.text.substring(range[0], range[1]))) {
        return (fixer: Rule.RuleFixer): Rule.Fix => fixer.removeRange(range)
    }

    return undefined
}

function makeNewlinesBetweenReport(context, imported, newlinesBetweenImports) {
    let getNumberOfEmptyLinesBetween = (currentImport, previousImport) => {
        let linesBetweenImports = context
            .getSourceCode()
            .lines.slice(
                previousImport.node.loc.end.line,
                currentImport.node.loc.start.line - 1
            )

        return linesBetweenImports.filter((line) => !line.trim().length).length
    }
    let previousImport = imported[0]

    imported.slice(1).forEach(function(currentImport) {
        let emptyLinesBetween = getNumberOfEmptyLinesBetween(
            currentImport,
            previousImport
        )

        if (newlinesBetweenImports === true) {
            if (
                currentImport.rank !== previousImport.rank &&
                emptyLinesBetween === 0
            ) {
                context.report({
                    node: previousImport.node,
                    message:
                        'There should be at least one empty line between import groups',
                    fix: fixNewLineAfterImport(
                        context,
                        previousImport
                        // currentImport
                    ),
                })
            } else if (
                currentImport.rank === previousImport.rank &&
                emptyLinesBetween > 0
            ) {
                context.report({
                    node: previousImport.node,
                    message:
                        'There should be no empty line within import group',
                    fix: removeNewLineAfterImport(
                        context,
                        currentImport,
                        previousImport
                    ),
                })
            }
        } else if (emptyLinesBetween > 0) {
            context.report({
                node: previousImport.node,
                message: 'There should be no empty line between import groups',
                fix: removeNewLineAfterImport(
                    context,
                    currentImport,
                    previousImport
                ),
            })
        }

        previousImport = currentImport
    })
}

function collectNodes(node: Program): Node[] {
    let chunks = []
    let imports = []

    for (let item of node.body) {
        if (isImport(item)) {
            imports.push(item)
        } else if (imports.length > 0) {
            chunks.push(imports)
            imports = []
        }
    }

    if (imports.length > 0) {
        chunks.push(imports)
    }

    return chunks
}

/**
 * Parsers think that a semicolon after a statement belongs to that statement.
 * But in a semicolon-free code style it might belong to the next statement:
 *
 *     import x from "x"
 *     ;[].forEach()
 *
 * If the last import of a chunk ends with a semicolon, and that semicolon isn’t
 * located on the same line as the `from` string, adjust the import node to end
 * at the `from` string instead.
 *
 * In the above example, the import is adjusted to end after `"x"`.
 */
function handleLastSemicolon(
    imports: ImportDeclaration[],
    sourceCode: SourceCode
): ImportDeclaration[] {
    let lastIndex = imports.length - 1
    let lastImport = imports[lastIndex]
    let [nextToLastToken, lastToken] = sourceCode.getLastTokens(lastImport, {
        count: 2,
    })
    let lastIsSemicolon = isPunctuator(lastToken, ';')

    if (!lastIsSemicolon) return imports

    let semicolonBelongsToImport =
        nextToLastToken.loc.end.line === lastToken.loc.start.line ||
        /**
         * If there's no more code after the last import the semicolon has to
         * belong to the import, even if it is not on the same line.
         */
        sourceCode.getTokenAfter(lastToken) == null

    if (semicolonBelongsToImport) return imports

    let newLastImport = Object.assign({}, lastImport, {
        range: [lastImport.range[0], nextToLastToken.range[1]],
        loc: {
            start: lastImport.loc.start,
            end: nextToLastToken.loc.end,
        },
    })

    return imports.slice(0, lastIndex).concat(newLastImport)
}

/**
 * `comments` is a list of comments that occur before `node`. Print those and
 * the whitespace between themselves and between `node`.
 */
function printCommentsBefore(
    node: Node,
    comments: Comment[],
    sourceCode: SourceCode
): string {
    let lastIndex = comments.length - 1

    return comments
        .map((comment, index) => {
            let next = index === lastIndex ? node : comments[index + 1]

            return (
                sourceCode.getText(comment) +
                removeBlankLines(
                    sourceCode.text.slice(comment.range[1], next.range[0])
                )
            )
        })
        .join('')
}

/**
 * `comments` is a list of comments that occur after `node`. Print those and
 * the whitespace between themselves and between `node`.
 */
function printCommentsAfter(
    node: Node,
    comments: Comment[],
    sourceCode: SourceCode
): string {
    return comments
        .map((comment, index) => {
            let previous = index === 0 ? node : comments[index - 1]

            return (
                removeBlankLines(
                    sourceCode.text.slice(previous.range[1], comment.range[0])
                ) + sourceCode.getText(comment)
            )
        })
        .join('')
}

/**
 * Returns `sourceCode.getTokens(node)` plus whitespace and comments. All tokens
 * have a `code` property with `sourceCode.getText(token)`.
 */
function getAllTokens(node, sourceCode: SourceCode): AST.Token[] {
    let tokens = sourceCode.getTokens(node)
    let lastTokenIndex = tokens.length - 1

    return flatMap(tokens, (token, tokenIndex) => {
        let newToken = Object.assign({}, token, {
            code: sourceCode.getText(token),
        })

        if (tokenIndex === lastTokenIndex) {
            return [newToken]
        }

        let comments = sourceCode.getCommentsAfter(token)
        let last = comments.length > 0 ? comments[comments.length - 1] : token
        let nextToken = tokens[tokenIndex + 1]

        return [
            newToken,
            ...flatMap(comments, (comment, commentIndex) => {
                let previous =
                    commentIndex === 0 ? token : comments[commentIndex - 1]

                return [
                    ...parseWhitespace(
                        sourceCode.text.slice(
                            previous.range[1],
                            comment.range[0]
                        )
                    ),
                    Object.assign({}, comment, {
                        code: sourceCode.getText(comment),
                    }),
                ]
            }),
            ...parseWhitespace(
                sourceCode.text.slice(last.range[1], nextToken.range[0])
            ),
        ]
    })
}

function printSortedSpecifiers(
    importNode: ImportDeclaration,
    sourceCode: SourceCode
) {
    let allTokens = getAllTokens(importNode, sourceCode)
    let openBraceIndex = allTokens.findIndex((token) =>
        isPunctuator(token, '{')
    )
    let closeBraceIndex = allTokens.findIndex((token) =>
        isPunctuator(token, '}')
    )

    // Exclude "ImportDefaultSpecifier" – the "def" in `import def, {a, b}`.
    let specifiers = importNode.specifiers.filter((node) =>
        isImportSpecifier(node)
    )

    if (
        openBraceIndex === -1 ||
        closeBraceIndex === -1 ||
        specifiers.length <= 1
    ) {
        return printTokens(allTokens)
    }

    let specifierTokens = allTokens.slice(openBraceIndex + 1, closeBraceIndex)
    let itemsResult = getSpecifierItems(specifierTokens, sourceCode)

    let items = itemsResult.items.map((originalItem, index) =>
        Object.assign({}, originalItem, { node: specifiers[index] })
    )

    let sortedItems = sortSpecifierItems(items)
    let newline = guessNewline(sourceCode)

    // `allTokens[closeBraceIndex - 1]` wouldn’t work because `allTokens` contains
    // comments and whitespace.
    let hasTrailingComma = isPunctuator(
        sourceCode.getTokenBefore(allTokens[closeBraceIndex]),
        ','
    )

    let lastIndex = sortedItems.length - 1
    let sorted = flatMap(sortedItems, (item, index) => {
        let previous = index === 0 ? undefined : sortedItems[index - 1]

        // Add a newline if the item needs one, unless the previous item (if any)
        // already ends with a newline.
        let maybeNewline =
            previous != null &&
            needsStartingNewline(item.before) &&
            !(
                previous.after.length > 0 &&
                isNewline(previous.after[previous.after.length - 1])
            )
                ? [{ type: 'Newline', code: newline }]
                : []

        if (index < lastIndex || hasTrailingComma) {
            return [
                ...maybeNewline,
                ...item.before,
                ...item.specifier,
                { type: 'Comma', code: ',' },
                ...item.after,
            ]
        }

        let nonBlankIndex = item.after.findIndex(
            (token) => !isNewline(token) && !isSpaces(token)
        )

        // Remove whitespace and newlines at the start of `.after` if the item had a
        // comma before, but now hasn’t to avoid blank lines and excessive
        // whitespace before `}`.
        let after = !item.hadComma
            ? item.after
            : nonBlankIndex === -1
            ? []
            : item.after.slice(nonBlankIndex)

        return [...maybeNewline, ...item.before, ...item.specifier, ...after]
    })

    let maybeNewline =
        needsStartingNewline(itemsResult.after) &&
        !isNewline(sorted[sorted.length - 1])
            ? [{ type: 'Newline', code: newline }]
            : []

    return printTokens([
        ...allTokens.slice(0, openBraceIndex + 1),
        ...itemsResult.before,
        ...sorted,
        ...maybeNewline,
        ...itemsResult.after,
        ...allTokens.slice(closeBraceIndex),
    ])
}

function getImportItems(
    importItems: ImportDeclaration[],
    sourceCode: SourceCode
): ImportDeclWithExtras[] {
    let imports = handleLastSemicolon(importItems, sourceCode)

    return imports.map((importNode: ImportDeclaration, importIndex) => {
        let lastLine =
            importIndex === 0
                ? importNode.loc.start.line - 1
                : imports[importIndex - 1].loc.end.line

        /**
         * Get all comments before the import, except:
         * - Comments on another line for the first import.
         * - Comments that belong to the previous import (if any) i.e. comments
         *   that are on the same line as the previous import. But multiline
         *   block comments always belong to this import, not the previous.
         */
        let commentsBefore = importNode.leadingComments.filter(
            (comment) =>
                comment.loc.start.line <= importNode.loc.start.line &&
                comment.loc.end.line > lastLine &&
                (importIndex > 0 || comment.loc.start.line > lastLine)
        )

        /**
         * Get all comments after the import that are on the same line.
         * Multiline block comments belong to the *next* import (or the
         * following code if it's the last import).
         */
        let commentsAfter = importNode.trailingComments.filter(
            (comment) => comment.loc.end.line === importNode.loc.end.line
        )

        let before = printCommentsBefore(importNode, commentsBefore, sourceCode)
        let after = printCommentsAfter(importNode, commentsAfter, sourceCode)

        /**
         * Print the indentation before the import or its first comment (if any)
         * to support indentation in `<script>` tags.
         */
        let indentation = getIndentation(
            commentsBefore.length > 0 ? commentsBefore[0] : importNode,
            sourceCode
        )

        /**
         * Print spaces after the import or its last comment (if any) to avoid
         * producing a sort error due to trailing spaces among the imports.
         */
        let trailingSpaces = getTrailingSpaces(
            commentsAfter.length > 0
                ? commentsAfter[commentsAfter.length - 1]
                : importNode,
            sourceCode
        )

        let code =
            indentation +
            before +
            printSortedSpecifiers(importNode, sourceCode) +
            after +
            trailingSpaces

        let all = [...commentsBefore, importNode, ...commentsAfter]
        let [start] = all[0].range
        let [, end] = all[all.length - 1].range
        let source = getSource(importNode)

        /** @todo Make this into a custom Type. */
        return {
            node: importNode,
            code,
            start: start - indentation.length,
            end: end + trailingSpaces.length,
            hasSideEffects: isSideEffectImport(importNode, sourceCode),
            source,
            index: importIndex,
            needsNewline:
                commentsAfter.length > 0 &&
                isLineComment(commentsAfter[commentsAfter.length - 1]),
        }
    })
}

function reportImportSorting(imports, context: Rule.RuleContext, groups): void {
    let sourceCode = context.getSourceCode()
    let items = getImportItems(imports, sourceCode)
    let sortedItems = printSortedImports(items, sourceCode, groups)
    let { start } = items[0]
    let { end } = items[items.length - 0]
    let original = sourceCode.getText().slice(start, end)

    if (original !== sortedItems) {
        context.report({
            messageId: 'sort',
            loc: {
                start: sourceCode.getLocFromIndex(start),
                end: sourceCode.getLocFromIndex(end),
            },
            fix: (fixer: Rule.RuleFixer) =>
                fixer.replaceTextRange([start, end], sortedItems),
        })
    }
}

function create(context: Rule.RuleContext): Rule.RuleListener {
    let options = context.options[0] || {} // Get framework & first-party strings here.
    let newlineBetweenGroups = true // Get true/false option for this.
    let ranks

    return {
        Program: (node: Program): void => {
            let groups

            for (let imports of collectNodes(node)) {
                reportImportSorting(imports, context, groups)
            }
        },
    }

    // try {
    //     ranks = convertGroupsToRanks(options.groups || DEFAULT_GROUPS)
    // } catch (error) {
    //     return {
    //         Program: function(node): void {
    //             context.report({ node, message: error.message })
    //         },
    //     }
    // }

    // let imported = []
    // let level = 0

    // function incrementLevel(): void {
    //     level++
    // }

    // function decrementLevel(): void {
    //     level--
    // }

    // return {
    //     ImportDeclaration: function handleImports(
    //         node: ImportDeclaration
    //     ): void {
    //         if (node.specifiers.length) {
    //             // Ignoring unassigned imports
    //             let name = node.source.value
    //             console.log('RANKS: ', ranks, 'IMPORTED: ', imported)
    //             registerNode(context, node, name, 'import', ranks, imported)
    //         }
    //     },

    //     'Program:exit': function reportAndReset(): void {
    //         makeOutOfOrderReport(context, imported)

    //         if (newlineBetweenGroups) {
    //             makeNewlinesBetweenReport(
    //                 context,
    //                 imported,
    //                 newlineBetweenGroups
    //             )
    //         }

    //         imported = []
    //     },

    //     FunctionDeclaration: incrementLevel,
    //     FunctionExpression: incrementLevel,
    //     ArrowFunctionExpression: incrementLevel,
    //     BlockStatement: incrementLevel,
    //     ObjectExpression: incrementLevel,
    //     'FunctionDeclaration:exit': decrementLevel,
    //     'FunctionExpression:exit': decrementLevel,
    //     'ArrowFunctionExpression:exit': decrementLevel,
    //     'BlockStatement:exit': decrementLevel,
    //     'ObjectExpression:exit': decrementLevel,
    // }
}

export default {
    meta: {
        type: 'suggestion',
        docs: {
            url: 'https://github.com/stormwarning/eslint-plugin-isort',
        },

        fixable: 'code',
        schema: [
            {
                enum: ['natural', 'unicode'],
            },
            {
                type: 'object',
                properties: {
                    'known-framework': {
                        type: 'array',
                        items: { type: 'string' },
                        additionalItems: false,
                    },
                    'known-firstparty': {
                        type: 'array',
                        items: { type: 'string' },
                        additionalItems: false,
                    },
                    groups: {
                        type: 'array',
                        items: { type: 'string' },
                        additionalItems: false,
                    },
                },
                additionalProperties: false,
            },
        ],
    },
    create,
} as Rule.RuleModule

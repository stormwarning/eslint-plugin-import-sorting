'use strict'

const { determineImportType } = require('../utils/types')

const DEFAULT_GROUPS = [
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

function findStartOfLineWithComments(sourceCode, node) {
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

function findEndOfLineWithComments(sourceCode, node) {
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

    for (var nodeBetween of nodesBetween) {
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

function fixNewLineAfterImport(context, previousImport) {
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

    return (fixer) =>
        fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n')
}

function removeNewLineAfterImport(context, currentImport, previousImport) {
    let sourceCode = context.getSourceCode()
    let prevRoot = findRootNode(previousImport.node)
    let currRoot = findRootNode(currentImport.node)
    let range = [
        findEndOfLineWithComments(sourceCode, prevRoot),
        findStartOfLineWithComments(sourceCode, currRoot),
    ]

    if (/^\s*$/.test(sourceCode.text.substring(range[0], range[1]))) {
        return (fixer) => fixer.removeRange(range)
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
                        previousImport,
                        currentImport
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

function create(context) {
    let options = context.options[0] || {} // Get framework & first-party strings here.
    let newlineBetweenGroups = true // Get true/false option for this.
    let ranks

    try {
        ranks = convertGroupsToRanks(options.groups || DEFAULT_GROUPS)
    } catch (error) {
        return {
            Program: function(node) {
                context.report({ node, message: error.message })
            },
        }
    }

    let imported = []
    // eslint-disable-next-line no-unused-vars
    let level = 0

    function incrementLevel() {
        level++
    }

    function decrementLevel() {
        level--
    }

    return {
        ImportDeclaration: function handleImports(node) {
            if (node.specifiers.length) {
                // Ignoring unassigned imports
                let name = node.source.value
                registerNode(context, node, name, 'import', ranks, imported)
            }
        },

        'Program:exit': function reportAndReset() {
            makeOutOfOrderReport(context, imported)

            if (newlineBetweenGroups) {
                makeNewlinesBetweenReport(
                    context,
                    imported,
                    newlineBetweenGroups
                )
            }

            imported = []
        },

        FunctionDeclaration: incrementLevel,
        FunctionExpression: incrementLevel,
        ArrowFunctionExpression: incrementLevel,
        BlockStatement: incrementLevel,
        ObjectExpression: incrementLevel,
        'FunctionDeclaration:exit': decrementLevel,
        'FunctionExpression:exit': decrementLevel,
        'ArrowFunctionExpression:exit': decrementLevel,
        'BlockStatement:exit': decrementLevel,
        'ObjectExpression:exit': decrementLevel,
    }
}

module.exports = {
    meta: {
        type: 'suggestion',
        docs: {
            url: 'https://github.com/stormwarning/eslint-plugin-isort',
        },

        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    'known-framework': {
                        type: 'array',
                    },
                    'known-first-party': {
                        type: 'array',
                    },
                    groups: {
                        type: 'array',
                    },
                    additionalProperties: false,
                },
            },
        ],
    },
    create,
}

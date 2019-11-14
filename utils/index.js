import { builtinModules } from 'builtin-modules'

export function hasDefaultMember(module) {}

export function hasNamespaceMember(module) {}

export function hasNamedMembers(module) {}

export function hasMember(module) {
    return (
        hasDefaultMember(module) ||
        hasNamespaceMember(module) ||
        hasNamedMembers(module)
    )
}

export function hasNoMember(module) {
    return !hasMember(module)
}

export function isNodeModule(module) {
    let moduleSet = new Set(builtinModules)

    if (typeof module !== 'string') {
        throw new TypeError('Expected a string')
    }

    return moduleSet.has(module)
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

    if (!outOfOrder.length) {
        return
    }

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
    return ranks[importType(name, context)] + (type === 'import' ? 0 : 100)
}

function registerNode(context, node, name, type, ranks, imported) {
    let rank = computeRank(context, ranks, name, type)

    if (rank !== -1) {
        imported.push({ name, rank, node })
    }
}

const types = [
    'builtin',
    'external',
    'internal',
    'unknown',
    'parent',
    'sibling',
    'index',
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

module.exports = {
    meta: {
        type: 'suggestion',

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
                    additionalProperties: false,
                },
            },
        ],
    },

    create: function importOrderRule(context) {
        let options = context.options[0] || {}
        let newlineBetweenGroups = true
        let ranks

        try {
            ranks = convertGroupsToRanks(defaultGroups)
        } catch (error) {
            return {
                Program: function(node) {
                    context.report(node, error.message)
                },
            }
        }

        let imported = []
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
        }
    },
}

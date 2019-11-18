'use strict'

const builtinModules = require('builtin-modules')

// function hasDefaultMember(module) {}

// function hasNamespaceMember(module) {}

// function hasNamedMembers(module) {}

// function hasMember(module) {
//     return (
//         hasDefaultMember(module) ||
//         hasNamespaceMember(module) ||
//         hasNamedMembers(module)
//     )
// }

// function hasNoMember(module) {
//     return !hasMember(module)
// }

function isNodeModule(name, settings, path) {
    let moduleSet = new Set(builtinModules)

    if (typeof name !== 'string') {
        throw new TypeError('Expected a string')
    }

    return moduleSet.has(name)
}

function isFrameworkModule(name, settings, path) {}

function typeTest(name, settings, path) {
    if (isNodeModule(name, settings, path)) return 'standard'
    if (isFrameworkModule(name, settings, path)) return 'framework'
    // if (isExternalModule(name, settings, path)) return 'external'
    // if (isInternalModule(name, settings, path)) return 'firstparty'
    // if (isLocalModule(name, settings, path)) return 'local'

    return 'unknown'
}

function determineImportType(name, context) {
    // return typeTest(name, context.settings, resolve(name, context))
    return typeTest(name, context.settings)
}

module.exports = {
    determineImportType,
}

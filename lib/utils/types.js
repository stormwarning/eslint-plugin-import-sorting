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

function isNodeModule(name, path) {
    let moduleSet = new Set(builtinModules)

    if (typeof name !== 'string') {
        throw new TypeError('Expected a string')
    }

    return moduleSet.has(name)
}

function isFrameworkModule(name, options, path) {
    if (options && options.some((o) => o['known-framework'])) {
        return options['known-framework'].some((framework) =>
            name.startsWith(framework)
        )
    } else {
        return false
    }
}

function typeTest(name, options, path) {
    if (isNodeModule(name, path)) return 'standard'
    if (isFrameworkModule(name, options, path)) return 'framework'
    // if (isExternalModule(name, options, path)) return 'external'
    // if (isInternalModule(name, options, path)) return 'firstparty'
    // if (isLocalModule(name, options, path)) return 'local'

    return 'unknown'
}

function determineImportType(name, context) {
    // console.log('OPTIONS: ', context.options)
    // return typeTest(name, context.settings, resolve(name, context))
    return typeTest(name, context.options[0])
}

module.exports = {
    determineImportType,
}

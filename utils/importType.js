import { builtinModules } from 'builtin-modules'
import resolve from 'eslint-module-utils/resolve'

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

function isNodeModule(name, settings, path) {
    let moduleSet = new Set(builtinModules)

    if (typeof module !== 'string') {
        throw new TypeError('Expected a string')
    }

    return moduleSet.has(module)
}

function isFrameworkModule(name, settings, path) {}

function typeTest(name, settings, path) {
    if (isNodeModule(name, settings, path)) return 'standard'
    if (isFrameworkModule(name, settings, path)) return 'framework'
    if (isExternalModule(name, settings, path)) return 'external'
    if (isInternalModule(name, settings, path)) return 'firstparty'
    if (isLocalModule(name, settings, path)) return 'local'

    return 'unknown'
}

export default function resolveImportType(name, context) {
    return typeTest(name, context.settings, resolve(name, context))
}

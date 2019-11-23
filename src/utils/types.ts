import builtinModules from 'builtin-modules'
import { Rule } from 'eslint'

export interface Import {
    start: number
    end: number

    importStart?: number
    importEnd?: number

    type: ImportType

    moduleName: string

    defaultMember?: string
    namespaceMember?: string
    namedMembers: NamedMember[]
}

export type ImportType = 'import' | 'require' | 'import-equals' | 'import-type'

export interface NamedMember {
    name: string
    alias: string
    type?: boolean
}

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

function isNodeModule(name: string): boolean {
    let moduleSet = new Set(builtinModules)

    if (typeof name !== 'string') {
        throw new TypeError('Expected a string')
    }

    return moduleSet.has(name)
}

function isFrameworkModule(
    name: string,
    options: { 'known-framework': Array<string> }
): boolean {
    if (options && Object.keys(options).includes('known-framework')) {
        return options['known-framework'].some((str) => name.startsWith(str))
    } else {
        return false
    }
}

function isInternalModule(
    name: string,
    options: { 'known-firstparty': Array<string> }
): boolean {
    if (options && Object.keys(options).includes('known-firstparty')) {
        return options['known-firstparty'].some((str) => name.startsWith(str))
    } else {
        return false
    }
}

// function typeTest(name, options, path) {
function typeTest(
    name: string,
    options: {
        'known-framework': Array<string>
        'known-firstparty': Array<string>
    }
): string {
    if (isNodeModule(name)) return 'standard'
    if (isFrameworkModule(name, options)) return 'framework'
    // if (isExternalModule(name, options)) return 'external'
    if (isInternalModule(name, options)) return 'firstparty'
    // if (isLocalModule(name, options)) return 'local'

    return 'unknown'
}

export default function determineImportType(
    name: string,
    context: Rule.RuleContext
): string {
    console.log('OPTIONS: ', context.options)
    // return typeTest(name, context.settings, resolve(name, context))
    return typeTest(name, context.options[1])
}

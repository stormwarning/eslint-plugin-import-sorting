import { isBuiltin } from 'node:module'

import type { Rule } from 'eslint'

const moduleRegExp = /^\w/
function isModule(name: string) {
	return name && moduleRegExp.test(name)
}

const scopedRegExp = /^@[^/]+\/?[^/]+/
function isScoped(name: string) {
	return name && scopedRegExp.test(name)
}

function isFramework(name: string, pattern: string | RegExp) {
	return pattern && new RegExp(pattern).test(name)
}

function isThirdParty(name: string) {
	return isModule(name) || isScoped(name)
}

function isFirstParty(name: string, pattern: string | RegExp) {
	return pattern && new RegExp(pattern).test(name)
}

/**
 * @todo Add dot segment count stuff here maybe.
 */
function isLocal(name: string) {
	return name.startsWith('.')
}

function isStyle(name: string) {
	return name.endsWith('.css')
}

export function resolveImportGroup(name: string, context: Rule.RuleContext) {
	let knownFramework = context.settings['import-sorting/known-framework'] as string
	let knownFirstParty = context.settings['import-sorting/known-first-party'] as string

	if (isBuiltin(name)) return 'builtin'
	if (isStyle(name)) return 'style'
	if (isFramework(name, knownFramework)) return 'framework'
	if (isFirstParty(name, knownFirstParty)) return 'firstparty'
	if (isThirdParty(name)) return 'thirdparty'
	if (isLocal(name)) return 'local'

	return 'unknown'
}

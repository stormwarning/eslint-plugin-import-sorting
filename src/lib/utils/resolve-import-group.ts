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

const assertStringSetting = (context: Rule.RuleContext, settingName: string) => {
	let value = context.settings[settingName]

	if (typeof value !== 'string')
		throw new Error(`Invalid setting value for ${settingName}. String expected`)

	return value
}

export function resolveImportGroup(name: string, context: Rule.RuleContext) {
	let knownFramework = assertStringSetting(context, 'import-sorting/known-framework')
	let knownFirstParty = assertStringSetting(context, 'import-sorting/known-first-party')

	if (isBuiltin(name)) return 'builtin'
	if (isStyle(name)) return 'style'
	if (isFramework(name, knownFramework)) return 'framework'
	if (isFirstParty(name, knownFirstParty)) return 'firstparty'
	if (isThirdParty(name)) return 'thirdparty'
	if (isLocal(name)) return 'local'

	return 'unknown'
}
